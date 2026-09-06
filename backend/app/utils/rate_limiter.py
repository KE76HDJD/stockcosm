import time
from collections import defaultdict
from fastapi import HTTPException, Request


class RateLimiter:
    def __init__(
        self,
        max_requests: int = 100,
        window_seconds: int = 60,
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._blocked: dict[str, float] = {}

    def _key(self, request: Request, identifier: str | None = None) -> str:
        if identifier:
            return identifier
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup(self, key: str):
        now = time.time()
        cutoff = now - self.window_seconds
        self._requests[key] = [t for t in self._requests[key] if t > cutoff]

    def check(self, request: Request, identifier: str | None = None):
        key = self._key(request, identifier)
        now = time.time()

        if key in self._blocked and now < self._blocked[key]:
            remaining = int(self._blocked[key] - now)
            raise HTTPException(
                status_code=429,
                detail=f"Trop de requêtes. Réessayez dans {remaining}s",
            )
        if key in self._blocked and now >= self._blocked[key]:
            del self._blocked[key]
            self._requests[key] = []

        self._cleanup(key)
        self._requests[key].append(now)

        if len(self._requests[key]) > self.max_requests:
            self._blocked[key] = now + self.window_seconds
            raise HTTPException(
                status_code=429,
                detail=f"Limite atteinte. Réessayez dans {self.window_seconds}s",
            )

    def record_failure(self, request: Request, identifier: str | None = None, block_seconds: int = 300):
        key = self._key(request, identifier)
        now = time.time()

        self._cleanup(key)
        self._requests[key].append(now)

        failures = len(self._requests[key])
        if failures >= 5:
            self._blocked[key] = now + block_seconds
            self._requests[key] = []
            raise HTTPException(
                status_code=429,
                detail=f"Compte temporairement bloqué. Réessayez dans {block_seconds}s",
            )

    def reset(self, request: Request, identifier: str | None = None):
        key = self._key(request, identifier)
        self._requests.pop(key, None)
        self._blocked.pop(key, None)


login_limiter = RateLimiter(max_requests=10, window_seconds=60)
assistant_limiter = RateLimiter(max_requests=30, window_seconds=60)
api_limiter = RateLimiter(max_requests=200, window_seconds=60)
