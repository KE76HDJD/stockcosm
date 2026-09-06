import re
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

router = APIRouter(prefix="/api", tags=["Assistant IA"])


class AssistantQuery(BaseModel):
    question: str


class AssistantResponse(BaseModel):
    intent: str
    answer: str
    data: dict | list | None = None
    suggestion: str | None = None


def detect_intent(question: str) -> tuple[str, dict]:
    q = question.lower().strip()
    args = {}

    # Produit le plus / moins vendu
    if re.search(r"(plus vendu|meilleur|top|best|se vend le plus|plus populaire|plus demandé)", q):
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
    if re.search(r"(alerte|rupture|faible|risk|risque|probl[èe]me|manque)", q):
        return "alertes", {}

    # Ventes
    if re.search(r"(vente|vendu|sale|achete|achat)", q):
        if re.search(r"(mois|mensuel|month)", q):
            return "ventes_mois", {}
        return "ventes_jour", {}

    # Stock par catégorie
    if re.search(r"(cat[ée]gorie|categorie|catégorie|groupe|family)", q):
        cat_match = re.search(
            r"(?:cat[ée]gorie|categorie|catégorie)\s+(?:de\s+|du\s+|des\s+|:)?\s*(.+)",
            q,
        )
        if cat_match:
            args["nom_categorie"] = cat_match.group(1).strip()
        else:
            words = q.split()
            for i, w in enumerate(words):
                if re.search(r"(cat[ée]gorie|categorie|catégorie)", w):
                    rest = " ".join(words[i + 1 :]).strip()
                    rest = re.sub(r"^(de\s+|du\s+|des\s+|:\s*)", "", rest)
                    if rest:
                        args["nom_categorie"] = rest
                        break
        if args.get("nom_categorie"):
            return "stock_categorie", args
        return "list_categories", {}

    # Recherche produit
    if re.search(r"(cherche|recherche|find|trouve|search|est-ce qu.on a|on a)", q):
        query_text = re.sub(
            r"(?:cherche|recherche|find|trouve|search|est-ce qu.on a|on a)\s*",
            "",
            q,
            flags=re.IGNORECASE,
        ).strip()
        query_text = re.sub(r"^(le\s+|la\s+|les\s+|un\s+|une\s+|du\s+|de\s+|d'\s*)", "", query_text).strip()
        if query_text:
            args["query"] = query_text
            return "recherche", args
        return "search_help", {}

    # Stock produit
    if re.search(r"(stock|quantit[ée]|combien|reste|disponible|inventory)", q):
        name_match = re.search(
            r"(?:stock|quantit[ée]|combien|reste|disponible|inventory)\s+(?:de\s+|du\s+|des\s+|pour\s+|sur\s+)?\s*(.+)",
            q,
        )
        if name_match:
            name = name_match.group(1).strip()
            name = re.sub(r"^(le\s+|la\s+|les\s+|un\s+|une\s+|'\s*)", "", name).strip()
            args["nom_produit"] = name
            return "stock_produit", args
        return "stock_help", {}

    # Bonjour / salut / aide
    if re.search(r"(bonjour|salut|hello|hey|aide|help|comment|que peux|que peut)", q):
        return "greeting", {}

    return "unknown", {}


async def execute_intent(intent: str, args: dict, db: AsyncSession) -> dict:
    if intent == "stock_produit":
        nom = args.get("nom_produit", "")
        result = await db.execute(
            select(Produit)
            .where(Produit.name.ilike(f"%{nom}%"), Produit.status == "ACTIVE")
            .limit(5)
        )
        produits = result.scalars().all()
        if not produits:
            return {
                "text": f"Produit \"{nom}\" non trouvé dans le catalogue.",
                "suggestion": "/produits",
            }
        if len(produits) == 1:
            p = produits[0]
            stock = await StockService.get_stock_actuel(db, p.id)
            return {
                "text": f"Stock de \"{p.name}\" : {stock} unités.",
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
        produits = result.scalars().all()
        if not produits:
            return {"text": f"Aucun produit trouvé pour \"{query}\".", "suggestion": "/produits"}
        lines = [f"• {p.name} — Stock : {p.stock_quantity}" for p in produits]
        return {
            "text": f"{len(produits)} résultat(s) pour \"{query}\" :\n" + "\n".join(lines),
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
    result = await execute_intent(intent, args, db)

    return AssistantResponse(
        intent=intent,
        answer=result["text"],
        data=result.get("data"),
        suggestion=result.get("suggestion"),
    )
