import re
import json as json_lib
import logging
from datetime import date, datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models.utilisateur import Utilisateur
from app.models.produit import Produit
from app.services.stock_service import StockService
from app.services.alerte_service import AlerteService
from app.services.inventaire_service import InventaireService
from app.services.categorie_service import CategorieService
from app.utils.rate_limiter import assistant_limiter
from app.config import get_settings
import httpx
from rapidfuzz import fuzz, process
from unidecode import unidecode

logger = logging.getLogger("stockcosm.assistant")

router = APIRouter(prefix="/api", tags=["Assistant IA"])


class AssistantQuery(BaseModel):
    question: str


class AssistantResponse(BaseModel):
    intent: str
    answer: str
    data: dict | list | None = None
    suggestion: str | None = None


TYPO_MAP = {
    "sotck": "stock", "sotock": "stock", "stcok": "stock", "stok": "stock", "stoock": "stock",
    "sock": "stock", "stcoke": "stock", "sotcke": "stock",
    "qantite": "quantite", "quantitte": "quantite", "qunatite": "quantite", "quanite": "quantite",
    "dispo": "disponible", "restte": "reste", "combient": "combien",
}

def _normalize_question(q: str) -> str:
    q_low = unidecode(q.lower())
    for typo, fix in TYPO_MAP.items():
        q_low = re.sub(rf"\b{typo}\b", fix, q_low)
    return q_low

def detect_intent(question: str) -> tuple[str, dict]:
    q_raw = question.lower().strip()
    q = _normalize_question(question)
    args = {}

    # Produit le plus / moins vendu
    if re.search(r"(plus vendu|meilleur|top|best|se vend le plus|plus populaire|plus demande)", q):
        args["periode"] = "jour"
        if re.search(r"(mois|mensuel|month)", q):
            args["periode"] = "mois"
        return "top_produit", args

    if re.search(r"(moins vendu|pire|worst|bottom|le moins|le plus mal)", q):
        args["periode"] = "jour"
        if re.search(r"(mois|mensuel|month)", q):
            args["periode"] = "mois"
        return "bottom_produit", args

    # Alertes / rupture / stock faible
    if re.search(r"(alerte|rupture|faible|risk|risque|probleme|manque)", q):
        return "alertes", {}

    # Ventes
    if re.search(r"(vente|vendu|sale|achete|achat)", q):
        if re.search(r"(mois|mensuel|month)", q):
            return "ventes_mois", {}
        return "ventes_jour", {}

    # Stock par catégorie
    if re.search(r"(categorie|groupe|family)", q):
        cat_match = re.search(
            r"(?:categorie)\s+(?:de\s+|du\s+|des\s+|:)?\s*(.+)",
            q,
        )
        if cat_match:
            args["nom_categorie"] = cat_match.group(1).strip()
        else:
            words = q.split()
            for i, w in enumerate(words):
                if "categorie" in w:
                    rest = " ".join(words[i + 1 :]).strip()
                    rest = re.sub(r"^(de\s+|du\s+|des\s+|:\s*)", "", rest)
                    if rest:
                        args["nom_categorie"] = rest
                        break
        if args.get("nom_categorie"):
            return "stock_categorie", args
        return "list_categories", {}

    # Recherche produit - elargi pour "donne moi le produit X"
    if re.search(r"(cherche|recherche|find|trouve|search|est-ce qu.on a|on a|donne.*produit|montre.*produit|affiche.*produit)", q):
        query_text = re.sub(
            r"(?:cherche|recherche|find|trouve|search|est-ce qu.on a|on a|donne.*produit|montre.*produit|affiche.*produit)\s*",
            "",
            q_raw.lower(),
            flags=re.IGNORECASE,
        ).strip()
        # Si on a capturé via donne/produit, extraire le nom après produit
        if not query_text or len(query_text) < 2:
            m = re.search(r"produit\s+(.+)", q_raw, re.IGNORECASE)
            if m:
                query_text = m.group(1).strip()
        query_text = re.sub(r"^(le\s+|la\s+|les\s+|un\s+|une\s+|du\s+|de\s+|d'\s*)", "", query_text).strip()
        # Nettoyer les mots parasites comme "donne moi", "stp", "svp"
        query_text = re.sub(r"^(donne\s+moi\s+|donne\s+|stp\s+|svp\s+|le\s+stock\s+de\s+|son\s+stock\s*)", "", query_text, flags=re.IGNORECASE).strip()
        query_text = re.sub(r"\s+(son\s+stock|sont\s+stock|stock.*)$", "", query_text, flags=re.IGNORECASE).strip()
        if query_text and len(query_text) >= 2:
            args["query"] = query_text
            # Si la question contient stock/quantite, c'est stock_produit plutot que recherche
            if re.search(r"(stock|quantite|combien|reste|disponible)", q):
                args["nom_produit"] = query_text
                return "stock_produit", args
            return "recherche", args
        # fallback pour "donne moi le produit X stock"
        if re.search(r"produit", q):
            m = re.search(r"produit\s+([a-z0-9\s\-éèê]+)", q_raw, re.IGNORECASE)
            if m:
                name = m.group(1).strip()
                name = re.sub(r"\s+(son|sont)\s+stock.*$", "", name, flags=re.IGNORECASE).strip()
                if len(name) >= 2:
                    args["nom_produit"] = name
                    return "stock_produit", args

    # Stock produit - avec typo tolerance deja normalise
    if re.search(r"(stock|quantite|combien|reste|disponible|inventory)", q):
        name_match = re.search(
            r"(?:stock|quantite|combien|reste|disponible|inventory)\s+(?:de\s+|du\s+|des\s+|pour\s+|sur\s+)?\s*(.+)",
            q,
        )
        if name_match:
            name = name_match.group(1).strip()
            name = re.sub(r"^(le\s+|la\s+|les\s+|un\s+|une\s+|'\s*)", "", name).strip()
            name = re.sub(r"\s+(sont|son)\s+stock.*$", "", name, flags=re.IGNORECASE).strip()
            if len(name) >= 2:
                args["nom_produit"] = name
                return "stock_produit", args
        # Cas "produit X son stock" / "X sont sotock" / "X stock" -> extraire avant
        m2 = re.search(r"(.+?)\s+(?:son|sont)\s+stock", q)
        if m2:
            name = m2.group(1).strip()
            name = re.sub(r"^(donne\s+moi\s+|donne\s+|le\s+|la\s+|les\s+|produit\s+|du\s+|de\s+)+", "", name).strip()
            if len(name) >= 2:
                args["nom_produit"] = name
                return "stock_produit", args
        # Cas "beure sotock" / "beurre eclair stock" (produit avant stock)
        m3 = re.search(r"(.+?)\s+stock$", q.strip())
        if m3:
            name = m3.group(1).strip()
            name = re.sub(r"^(donne\s+moi\s+|donne\s+|le\s+|la\s+|les\s+|produit\s+|du\s+|de\s+)+", "", name).strip()
            if len(name) >= 2 and len(name.split()) <= 6:
                args["nom_produit"] = name
                return "stock_produit", args
        return "stock_help", {}

    # Bonjour / salut / aide
    if re.search(r"(bonjour|salut|hello|hey|aide|help|comment|que peux|que peut)", q):
        return "greeting", {}

    return "unknown", {}


async def detect_intent_mistral(question: str, produits: list[str], categories: list[str]) -> tuple[str, dict]:
    settings = get_settings()
    api_key = settings.MISTRAL_API_KEY
    if not api_key:
        return "unknown", {}
    try:
        prompt = f"""Tu es l'assistant de stock pour KET SKIN CARE BY MINA LA PREFEREE (cosmétiques).
Produits: {', '.join(produits[:30])}
Catégories: {', '.join(categories)}

Intents possibles: stock_produit (besoin: nom_produit), recherche (besoin: query), stock_categorie (besoin: nom_categorie), list_categories, alertes, ventes_jour, ventes_mois, top_produit (periode jour/mois), bottom_produit, greeting.

Question utilisateur: "{question}"

Corrige les fautes (sotock->stock, beur→beurre). Si la question mentionne un produit même sans mot-clé stock (ex: "donne moi le produit X son stock", "produit beure"), choisis stock_produit.

Réponds UNIQUEMENT en JSON: {{"intent": "...", "args": {{...}}}} sans texte autour."""
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "mistral-small-latest",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 150,
                },
            )
            if resp.status_code != 200:
                logger.warning(f"Mistral {resp.status_code}: {resp.text[:200]}")
                return "unknown", {}
            data = resp.json()
            content = data["choices"][0]["message"]["content"].strip()
            # Extraire JSON
            m = re.search(r"\{.*\}", content, re.DOTALL)
            if not m:
                return "unknown", {}
            obj = json_lib.loads(m.group(0))
            intent = obj.get("intent", "unknown")
            args = obj.get("args", {})
            # Normaliser periode
            if intent in ("top_produit", "bottom_produit") and "periode" not in args:
                args["periode"] = "jour"
            return intent, args
    except Exception as e:
        logger.warning(f"Mistral fallback fail: {e}")
        return "unknown", {}


def fuzzy_find_produits(query: str, produits: list[Produit], limit: int = 5, cutoff: int = 60) -> list[Produit]:
    if not query or not produits:
        return []
    q_norm = unidecode(query.lower())
    scored = []
    for p in produits:
        name_norm = unidecode(p.name.lower())
        # Score multi-métriques
        score = max(
            fuzz.ratio(q_norm, name_norm),
            fuzz.partial_ratio(q_norm, name_norm),
            fuzz.token_set_ratio(q_norm, name_norm),
        )
        if score >= cutoff:
            scored.append((score, p))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in scored[:limit]]


async def execute_intent(intent: str, args: dict, db: AsyncSession) -> dict:
    if intent == "stock_produit":
        nom = args.get("nom_produit", "") or args.get("query", "")
        # 1) ilike rapide
        result = await db.execute(
            select(Produit)
            .where(Produit.name.ilike(f"%{nom}%"), Produit.status == "ACTIVE")
            .limit(5)
        )
        produits = list(result.scalars().all())
        # 2) fuzzy si rien ou peu
        if len(produits) == 0:
            all_res = await db.execute(select(Produit).where(Produit.status == "ACTIVE"))
            all_produits = list(all_res.scalars().all())
            fuzzy = fuzzy_find_produits(nom, all_produits, limit=5, cutoff=60)
            produits = fuzzy
            if fuzzy:
                # proposer correction
                best = fuzzy[0].name
                if unidecode(nom.lower()) != unidecode(best.lower()) and fuzz.ratio(unidecode(nom.lower()), unidecode(best.lower())) < 95:
                    pass  # on garde le fuzzy
        if not produits:
            return {
                "text": f"Produit \"{nom}\" non trouvé. Vouliez-vous dire un de ces produits ? Essayez 'cherche {nom[:8]}' ou vérifiez l'orthographe.",
                "suggestion": "/produits",
            }
        if len(produits) == 1:
            p = produits[0]
            stock = await StockService.get_stock_actuel(db, p.id)
            prefix = ""
            if unidecode(nom.lower()) not in unidecode(p.name.lower()) and fuzz.ratio(unidecode(nom.lower()), unidecode(p.name.lower())) < 90:
                prefix = f"(Correction : \"{nom}\" → \"{p.name}\")\n"
            return {
                "text": f"{prefix}Stock de \"{p.name}\" : {stock} unités.",
                "data": {"produit_id": p.id, "stock": stock},
                "suggestion": "/produits",
            }
        lines = []
        for p in produits:
            stock = await StockService.get_stock_actuel(db, p.id)
            lines.append(f"• {p.name} : {stock} unités")
        return {
            "text": f"{len(produits)} produits correspondant à \"{nom}\" :\n" + "\n".join(lines),
            "data": [{"id": p.id, "name": p.name} for p in produits],
            "suggestion": "/produits",
        }

    elif intent == "stock_categorie":
        nom = args.get("nom_categorie", "")
        categories = await CategorieService.list_all(db)
        cat = next(
            (c for c in categories if nom.lower() in c["name"].lower()),
            None,
        )
        if not cat:
            cat_names = [c["name"] for c in categories]
            return {
                "text": f"Catégorie \"{nom}\" non trouvée.\nCatégories disponibles : {', '.join(cat_names)}",
                "suggestion": "/categories",
            }
        produits = await CategorieService.get_produits_by_categorie(db, cat["id"])
        total = sum(p["stock_quantity"] for p in produits)
        detail = [f"• {p['name']} : {p['stock_quantity']} unités" for p in produits]
        return {
            "text": f"Catégorie \"{cat['name']}\" : {total} unités ({len(produits)} produits)\n" + "\n".join(detail),
            "data": {"categorie": cat["name"], "total": total, "produits": len(produits)},
            "suggestion": "/categories",
        }

    elif intent == "list_categories":
        categories = await CategorieService.list_all(db)
        if not categories:
            return {"text": "Aucune catégorie créée.", "suggestion": "/categories"}
        lines = [f"• {c['name']} ({c['product_count']} produits)" for c in categories]
        return {
            "text": f"{len(categories)} catégorie(s) :\n" + "\n".join(lines),
            "data": categories,
            "suggestion": "/categories",
        }

    elif intent == "alertes":
        alertes = await AlerteService.get_alertes(db)
        if not alertes:
            return {"text": "Aucun produit en alerte. Tout va bien !", "suggestion": "/dashboard"}
        lines = [f"• {a['produit_nom']} : {a['stock_actuel']} unités ({a['statut']})" for a in alertes]
        return {
            "text": f"{len(alertes)} produit(s) en alerte :\n" + "\n".join(lines),
            "data": alertes,
            "suggestion": "/dashboard",
        }

    elif intent == "ventes_jour":
        stats = await InventaireService.stats_jour(db, date.today())
        total = stats["total_ventes"]
        par_produit = stats.get("par_produit", [])
        if total == 0:
            return {"text": "Aucune vente enregistrée aujourd'hui.", "data": stats, "suggestion": "/ventes"}
        lines = [f"• {p['produit']} : {p['quantite']} vendu(s)" for p in par_produit[:10]]
        return {
            "text": f"{total} vente(s) aujourd'hui :\n" + "\n".join(lines),
            "data": stats,
            "suggestion": "/ventes",
        }

    elif intent == "ventes_mois":
        today = date.today()
        stats = await InventaireService.stats_mois(db, today.year, today.month)
        total = stats["total_ventes"]
        top = stats.get("top_produits", [])
        if total == 0:
            return {"text": f"Aucune vente enregistrée en {today.strftime('%B %Y')}.", "data": stats, "suggestion": "/ventes"}
        lines = [f"• {p['produit']} : {p['quantite']} vendu(s)" for p in top[:10]]
        return {
            "text": f"{total} vente(s) en {today.strftime('%B %Y')} :\n" + "\n".join(lines),
            "data": stats,
            "suggestion": "/ventes",
        }

    elif intent == "top_produit":
        periode = args.get("periode", "jour")
        today = date.today()
        if periode == "mois":
            stats = await InventaireService.stats_mois(db, today.year, today.month)
            label = "ce mois"
        else:
            stats = await InventaireService.stats_jour(db, today)
            label = "aujourd'hui"
        produits = stats.get("top_produit", stats.get("par_produit", []))
        if not produits:
            return {"text": f"Aucune vente {label}.", "data": stats, "suggestion": "/ventes"}
        top = produits[0]
        return {
            "text": f"Produit le plus vendu {label} : \"{top['produit']}\" ({top['quantite']} unités).",
            "data": stats,
            "suggestion": "/ventes",
        }

    elif intent == "bottom_produit":
        periode = args.get("periode", "jour")
        today = date.today()
        if periode == "mois":
            stats = await InventaireService.stats_mois(db, today.year, today.month)
            label = "ce mois"
        else:
            stats = await InventaireService.stats_jour(db, today)
            label = "aujourd'hui"
        produits = stats.get("top_produit", stats.get("par_produit", []))
        if not produits:
            return {"text": f"Aucune vente {label}.", "data": stats, "suggestion": "/ventes"}
        bottom = produits[-1]
        return {
            "text": f"Produit le moins vendu {label} : \"{bottom['produit']}\" ({bottom['quantite']} unité(s)).",
            "data": stats,
            "suggestion": "/ventes",
        }

    elif intent == "recherche":
        query = args.get("query", "")
        result = await db.execute(
            select(Produit)
            .where(Produit.name.ilike(f"%{query}%"), Produit.status == "ACTIVE")
            .limit(10)
        )
        produits = list(result.scalars().all())
        if not produits:
            all_res = await db.execute(select(Produit).where(Produit.status == "ACTIVE"))
            fuzzy = fuzzy_find_produits(query, list(all_res.scalars().all()), limit=10, cutoff=60)
            produits = fuzzy
        if not produits:
            return {"text": f"Aucun produit trouvé pour \"{query}\". Essayez avec un autre mot-clé.", "suggestion": "/produits"}
        lines = [f"• {p.name} — Stock : {p.stock_quantity}" for p in produits]
        prefix = ""
        if produits and fuzz.ratio(unidecode(query.lower()), unidecode(produits[0].name.lower())) < 85:
            prefix = f"(Résultats pour \"{query}\" → correction proche)\n"
        return {
            "text": f"{prefix}{len(produits)} résultat(s) pour \"{query}\" :\n" + "\n".join(lines),
            "data": [{"id": p.id, "name": p.name} for p in produits],
            "suggestion": "/produits",
        }

    elif intent == "greeting":
        return {
            "text": "Bienvenue ! Je suis l'assistant de KET SKIN CARE BY MINA LA PREFEREE.\n\nExemples de questions :\n• Stock de savon noir\n• Produits en rupture\n• Ventes du jour\n• Quel produit se vend le plus\n• Cherche beurre",
            "suggestion": None,
        }

    elif intent == "stock_help":
        return {
            "text": "Pour connaître le stock d'un produit, tapez :\n• Stock de [nom du produit]\n• Combien de [nom] reste-t-il\n• Quantité disponible de [nom]",
            "suggestion": "/produits",
        }

    elif intent == "search_help":
        return {
            "text": "Pour rechercher un produit, tapez :\n• Cherche [texte]\n• Recherche [texte]\n• Est-ce qu'on a [texte] ?",
            "suggestion": "/produits",
        }

    else:
        return {
            "text": "Je n'ai pas compris votre question. Essayez par exemple :\n• Stock de savon noir\n• Produits en rupture\n• Ventes du jour\n• Quel produit se vend le plus\n• Cherche beurre",
            "suggestion": "/dashboard",
        }


@router.post("/assistant/query", response_model=AssistantResponse)
async def query_assistant(
    body: AssistantQuery,
    req: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    assistant_limiter.check(req, identifier=f"assistant:{current_user.id}")

    intent, args = detect_intent(body.question)
    # Regex + Mistral ensemble : si unknown/help ou stock_produit avec nom vide/court, on tente Mistral
    if intent in ("unknown", "stock_help", "search_help") or (intent == "stock_produit" and not args.get("nom_produit")) or (intent in ("recherche","stock_produit") and len(args.get("nom_produit","") or args.get("query","")) < 2):
        # Contexte produits/categories pour Mistral
        try:
            prod_res = await db.execute(select(Produit.name).where(Produit.status == "ACTIVE").limit(40))
            prod_names = [r[0] for r in prod_res.all()]
            cats = await CategorieService.list_all(db)
            cat_names = [c["name"] for c in cats]
            m_intent, m_args = await detect_intent_mistral(body.question, prod_names, cat_names)
            if m_intent != "unknown":
                intent, args = m_intent, m_args
        except Exception as e:
            logger.warning(f"Mistral intent fail: {e}")

    result = await execute_intent(intent, args, db)

    return AssistantResponse(
        intent=intent,
        answer=result["text"],
        data=result.get("data"),
        suggestion=result.get("suggestion"),
    )
