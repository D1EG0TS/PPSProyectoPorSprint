import time
from typing import Any, Dict, Optional, Tuple

class SimpleMemoryCache:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SimpleMemoryCache, cls).__new__(cls)
            cls._instance._store: Dict[str, Tuple[Any, float]] = {}
        return cls._instance

    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            data, expiry = self._store[key]
            if time.time() < expiry:
                return data
            else:
                del self._store[key]
        return None

    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """
        Set a value in cache with a TTL (default 5 minutes)
        """
        self._store[key] = (value, time.time() + ttl)

    def delete(self, key: str) -> None:
        if key in self._store:
            del self._store[key]

    def delete_pattern(self, pattern: str) -> None:
        """
        Delete keys starting with pattern. 
        Note: This is O(N) where N is cache size.
        """
        keys_to_delete = [k for k in self._store.keys() if k.startswith(pattern)]
        for k in keys_to_delete:
            del self._store[k]

    def clear(self) -> None:
        self._store.clear()

stock_cache = SimpleMemoryCache()
