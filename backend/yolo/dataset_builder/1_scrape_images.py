from __future__ import annotations

"""
Step 1: Multi-Engine Web Image Scraper for WalnutIQ Dataset Builder
-------------------------------------------------------------------
Combines patterns from:
  1. https://github.com/ultralytics/google-images-download (Bing HTML / Selenium search & format filters)
  2. https://github.com/ultralytics/flickr_scraper (Flickr keyword pagination & deduplication)
  3. DuckDuckGo Image Search (Zero-API-key instant fallback)

Usage:
  # Scrape all missing canopy & ground walnut categories automatically:
  python yolo/dataset_builder/1_scrape_images.py --engine all --max-per-query 80

  # Scrape only ground harvest walnuts (in-shell & in-hull on grass/soil/leaves):
  python yolo/dataset_builder/1_scrape_images.py --target ground --max-per-query 100

  # Use Flickr API (if you set FLICKR_API_KEY env var):
  python yolo/dataset_builder/1_scrape_images.py --engine flickr --max-per-query 100
"""

import argparse
import hashlib
import io
import json
import os
import re
import time
import urllib.parse
from pathlib import Path
from typing import Iterable

import requests
from PIL import Image

# Default search queries tailored to fill the gaps not covered by 1wuming/WalnutData
DEFAULT_SCRAPE_QUERIES: dict[str, dict[str, list[str]]] = {
    "ground": {
        "walnut_in_shell": [
            "fallen walnuts on ground grass harvest",
            "walnuts on soil autumn leaves orchard",
            "harvested walnuts on ground under tree",
            "english walnut shells on ground orchard",
            "walnut shaking harvest nuts on orchard floor",
            "chandler walnuts on ground before sweeping",
            "persian walnut nuts scattered on dirt ground",
        ],
        "walnut_in_hull": [
            "fallen green walnut hull on ground",
            "walnut in split green husk on ground",
            "black and green walnut hulls fallen on grass",
            "juglans regia fallen nuts with husks on soil",
            "dropped green walnuts under tree autumn",
            "rotting walnut husks on orchard floor",
            "walnuts with cracked green hulls on dirt",
        ],
        "background_no_walnut": [
            "empty orchard grass and soil ground",
            "dry autumn leaves on soil ground",
            "bare orchard dirt floor under trees",
            "green lawn grass and weeds close up",
        ],
    },
    "canopy": {
        "walnut_hull_split": [
            "walnut hull split on tree branch",
            "ripening walnut green husk cracking on tree",
            "juglans regia hull split harvest readiness",
            "walnut husk splitting open on tree",
            "mature walnut kernel visible in split hull on branch",
        ],
        "walnut_blight_damaged": [
            "walnut blight xanthomonas arboricola fruit damage",
            "walnut husk fly blackened walnut on tree",
            "diseased blighted walnut on tree branch",
            "walnut anthracnose black spots on green nut",
            "sunburn and blight lesions on walnut canopy",
        ],
        "walnut_green": [
            "green walnuts growing on tree branch",
            "juglans regia green fruit cluster canopy",
            "unripe green walnut cluster on tree leaves",
            "chandler walnut tree canopy fruiting branch",
        ],
        "background_no_walnut": [
            "tree branches with green leaves no fruit",
            "walnut tree foliage leaves canopy close up",
            "deciduous orchard tree canopy leaves sunlight",
            "empty green tree branches and twigs",
        ],
    },
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}


def scrape_bing_html(query: str, max_images: int = 60) -> list[str]:
    """
    Scrapes direct image URLs from Bing Images HTML pagination
    (following ultralytics/google-images-download Bing scraper pattern).
    """
    urls: list[str] = []
    seen: set[str] = set()
    first = 1

    while len(urls) < max_images and first < 250:
        encoded = urllib.parse.quote_plus(query)
        search_url = f"https://www.bing.com/images/async?q={encoded}&first={first}&count=35&adlt=off"
        try:
            resp = requests.get(search_url, headers=HEADERS, timeout=12)
            resp.raise_for_status()
            # Extract murl (media URL) from Bing async tiles
            matches = re.findall(r"murl&quot;:&quot;(.*?)&quot;", resp.text)
            if not matches:
                break
            for link in matches:
                if link not in seen and link.startswith("http"):
                    seen.add(link)
                    urls.append(link)
                    if len(urls) >= max_images:
                        break
        except Exception as exc:
            print(f"  [Bing Warning] {exc}")
            break
        first += 35
        time.sleep(0.5)

    return urls


def scrape_duckduckgo(query: str, max_images: int = 60) -> list[str]:
    """Scrapes image URLs using duckduckgo_search (installed in local Python)."""
    urls: list[str] = []
    try:
        from duckduckgo_search import DDGS

        with DDGS() as ddgs:
            results = ddgs.images(query, max_results=max_images)
            for r in results:
                img_url = r.get("image")
                if img_url and img_url.startswith("http"):
                    urls.append(img_url)
    except Exception as exc:
        print(f"  [DDG Warning] {exc}")
    return urls


def scrape_flickr_api(query: str, max_images: int = 60, api_key: str | None = None) -> list[str]:
    """
    Scrapes image URLs from Flickr REST API with pagination
    (following ultralytics/flickr_scraper pattern).
    """
    key = api_key or os.environ.get("FLICKR_API_KEY", "").strip()
    if not key:
        return []

    urls: list[str] = []
    page = 1
    per_page = min(100, max_images)

    while len(urls) < max_images and page <= 5:
        params = {
            "method": "flickr.photos.search",
            "api_key": key,
            "text": query,
            "tag_mode": "all",
            "extras": "url_o,url_l,url_c,url_z,url_m",
            "per_page": per_page,
            "page": page,
            "format": "json",
            "nojsoncallback": 1,
            "sort": "relevance",
        }
        try:
            resp = requests.get("https://api.flickr.com/services/rest/", params=params, timeout=12)
            data = resp.json()
            photos = data.get("photos", {}).get("photo", [])
            if not photos:
                break
            for p in photos:
                for size_key in ("url_l", "url_c", "url_z", "url_o", "url_m"):
                    if p.get(size_key):
                        urls.append(p[size_key])
                        break
                if len(urls) >= max_images:
                    break
        except Exception as exc:
            print(f"  [Flickr Warning] {exc}")
            break
        page += 1

    return urls


def scrape_google_html(query: str, max_images: int = 40) -> list[str]:
    """Scrapes direct image URLs from Google Images HTML."""
    urls: list[str] = []
    seen: set[str] = set()
    try:
        encoded = urllib.parse.quote_plus(query)
        search_url = f"https://www.google.com/search?tbm=isch&q={encoded}&hl=en"
        resp = requests.get(search_url, headers=HEADERS, timeout=12)
        if resp.status_code != 200 or "sorry/index" in resp.url:
            print("  [Google Warning] Rate-limited or blocked; skipping.", flush=True)
            return urls
        matches = re.findall(r'\["(https://[^"]+\.(?:jpg|jpeg|png|webp))",\d+,\d+\]', resp.text, re.IGNORECASE)
        for link in matches:
            if link not in seen and "gstatic.com" not in link:
                seen.add(link)
                urls.append(link)
                if len(urls) >= max_images:
                    break
    except Exception as exc:
        print(f"  [Google Warning] {exc}", flush=True)
    return urls


def scrape_yahoo_html(query: str, max_images: int = 40) -> list[str]:
    """Scrapes image URLs from Yahoo Image Search."""
    urls: list[str] = []
    seen: set[str] = set()
    try:
        encoded = urllib.parse.quote_plus(query)
        search_url = f"https://images.search.yahoo.com/search/images?p={encoded}"
        resp = requests.get(search_url, headers=HEADERS, timeout=12)
        if resp.status_code != 200:
            print(f"  [Yahoo Warning] HTTP {resp.status_code}", flush=True)
            return urls
        matches = re.findall(r"imgurl=([^&\"']+)", resp.text)
        for raw_link in matches:
            link = urllib.parse.unquote(raw_link)
            if not link.startswith("http"):
                link = f"https://{link.lstrip('/')}"
            if link not in seen:
                seen.add(link)
                urls.append(link)
                if len(urls) >= max_images:
                    break
    except Exception as exc:
        print(f"  [Yahoo Warning] {exc}", flush=True)
    return urls


def scrape_yandex_html(query: str, max_images: int = 40) -> list[str]:
    """Scrapes image URLs from Yandex Images (skips gracefully if CAPTCHA-gated)."""
    urls: list[str] = []
    seen: set[str] = set()
    try:
        encoded = urllib.parse.quote_plus(query)
        search_url = f"https://yandex.com/images/search?text={encoded}"
        resp = requests.get(search_url, headers=HEADERS, timeout=12)
        if resp.status_code != 200 or "showcaptcha" in resp.url:
            print("  [Yandex Warning] Rate-limited or CAPTCHA-gated; skipping.", flush=True)
            return urls
        matches = re.findall(r'"url":"(https?://[^"]+\.(?:jpg|jpeg|png|webp))"', resp.text, re.IGNORECASE)
        for link in matches:
            clean = link.replace("\\/", "/")
            if clean not in seen:
                seen.add(clean)
                urls.append(clean)
                if len(urls) >= max_images:
                    break
    except Exception as exc:
        print(f"  [Yandex Warning] {exc}", flush=True)
    return urls


def scrape_wikimedia(query: str, max_images: int = 40) -> list[str]:
    """Scrapes high-resolution public botanical/orchard photos from Wikimedia Commons API."""
    urls: list[str] = []
    try:
        params = {
            "action": "query",
            "generator": "search",
            "gsrnamespace": 6,
            "gsrsearch": query,
            "gsrlimit": min(50, max_images),
            "prop": "imageinfo",
            "iiprop": "url",
            "format": "json",
        }
        resp = requests.get(
            "https://commons.wikimedia.org/w/api.php",
            params=params,
            headers={"User-Agent": "WalnutIQDatasetBuilder/1.0"},
            timeout=12,
        )
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            infos = page.get("imageinfo", [])
            if infos and infos[0].get("url"):
                u = infos[0]["url"]
                if u.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    urls.append(u)
                    if len(urls) >= max_images:
                        break
    except Exception as exc:
        print(f"  [Wikimedia Warning] {exc}", flush=True)
    return urls


def scrape_instagram_indexed(query: str, max_images: int = 40) -> list[str]:
    """Searches public indexed Instagram walnut posts via Bing/DuckDuckGo."""
    ig_query = f"site:instagram.com {query}"
    urls = scrape_bing_html(ig_query, max_images)
    if len(urls) < max_images:
        urls.extend(scrape_duckduckgo(ig_query, max_images - len(urls)))
    return urls[:max_images]


def download_and_deduplicate(
    urls: Iterable[str],
    out_dir: Path,
    existing_hashes: set[str],
    min_size: int = 300,
    max_save: int | None = None,
) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    saved = 0

    for url in urls:
        if max_save is not None and saved >= max_save:
            break
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            if resp.status_code != 200 or not resp.content:
                continue

            digest = hashlib.sha256(resp.content).hexdigest()[:16]
            if digest in existing_hashes:
                continue

            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            w, h = img.size
            if w < min_size or h < min_size:
                continue

            existing_hashes.add(digest)
            out_path = out_dir / f"walnut_{digest}.jpg"
            img.save(out_path, format="JPEG", quality=92)
            saved += 1
        except Exception:
            continue

    return saved


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape walnut images (Bing / DuckDuckGo / Flickr) with deduplication"
    )
    parser.add_argument(
        "--target",
        choices=["all", "canopy", "ground"],
        default="all",
        help="Which dataset target to scrape ('canopy', 'ground', or 'all')",
    )
    parser.add_argument(
        "--engine",
        type=str,
        default="all",
        help="Comma-separated engines (bing,ddg,google,yahoo,yandex,wikimedia,instagram,flickr) or 'all'",
    )
    parser.add_argument(
        "--max-per-query",
        type=int,
        default=50,
        help="Max candidate URLs per search phrase",
    )
    parser.add_argument(
        "--min-size",
        type=int,
        default=300,
        help="Minimum width/height in pixels (default: 300)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="",
        help="Output folder for scraped images (default: backend/yolo/dataset_builder/raw_scraped)",
    )
    parser.add_argument(
        "--max-total",
        type=int,
        default=0,
        help="Optional hard cap on total images saved across all queries (0 = unlimited)",
    )
    parser.add_argument(
        "--queries-json",
        type=str,
        default="",
        help="Optional JSON array of specific search queries to run",
    )
    args = parser.parse_args()

    builder_root = Path(__file__).resolve().parent
    raw_root = (
        Path(args.output_dir).expanduser().resolve()
        if args.output_dir.strip()
        else (builder_root / "raw_scraped")
    )
    raw_root.mkdir(parents=True, exist_ok=True)

    selected_filter: set[str] | None = None
    if args.queries_json.strip():
        try:
            parsed_q = json.loads(args.queries_json)
            if isinstance(parsed_q, list) and len(parsed_q) > 0:
                selected_filter = {str(q) for q in parsed_q}
        except Exception:
            selected_filter = None

    targets = ["ground", "canopy"] if args.target == "all" else [args.target]
    filtered_plan: list[tuple[str, str, list[str]]] = []
    for tg in targets:
        for cls_name, q_list in DEFAULT_SCRAPE_QUERIES[tg].items():
            active_qs = (
                [q for q in q_list if q in selected_filter]
                if selected_filter is not None
                else list(q_list)
            )
            if active_qs:
                filtered_plan.append((tg, cls_name, active_qs))

    total_queries = sum(len(qs) for _, _, qs in filtered_plan)
    engine_order = [
        e.strip().lower()
        for e in (
            "bing,ddg,google,yahoo,yandex,wikimedia,instagram,flickr"
            if args.engine.strip().lower() == "all"
            else args.engine
        ).split(",")
        if e.strip()
    ]
    per_engine_cap = max(1, args.max_per_query)

    print(
        f"[Scraper] Criteria: target={args.target} | engines={','.join(engine_order)} | "
        f"per_category_per_engine={per_engine_cap} | queries={total_queries} | min_size={args.min_size}px",
        flush=True,
    )
    print(f"[Scraper] Saving downloaded images to: {raw_root}", flush=True)

    engine_fn_map = {
        "bing": scrape_bing_html,
        "ddg": scrape_duckduckgo,
        "google": scrape_google_html,
        "yahoo": scrape_yahoo_html,
        "yandex": scrape_yandex_html,
        "wikimedia": scrape_wikimedia,
        "instagram": scrape_instagram_indexed,
        "flickr": scrape_flickr_api,
    }

    existing_hashes: set[str] = set()
    if raw_root.exists():
        for existing_file in raw_root.rglob("*"):
            if not existing_file.is_file():
                continue
            stem = existing_file.stem
            if stem.startswith("walnut_") and len(stem) == len("walnut_") + 16:
                existing_hashes.add(stem[len("walnut_"):])
            else:
                try:
                    existing_hashes.add(
                        hashlib.sha256(existing_file.read_bytes()).hexdigest()[:16]
                    )
                except Exception:
                    pass
    if existing_hashes:
        print(
            f"[Scraper] Loaded {len(existing_hashes)} existing image hashes from {raw_root} (duplicates will be skipped).",
            flush=True,
        )
    total_saved = 0

    for target_group, class_name, queries in filtered_plan:
        class_out_dir = raw_root / target_group / class_name
        print(f"\n[Scraper] === Category: {target_group}/{class_name} ===", flush=True)

        for eng in engine_order:
            scraper_fn = engine_fn_map.get(eng)
            if scraper_fn is None:
                continue

            engine_cat_saved = 0
            print(
                f"[Scraper] [{target_group}/{class_name}] [{eng}] Target: up to {per_engine_cap} images",
                flush=True,
            )

            for q in queries:
                if engine_cat_saved >= per_engine_cap:
                    break

                remaining = per_engine_cap - engine_cat_saved
                print(
                    f"[Scraper] [{target_group}/{class_name}] [{eng}] Searching: '{q}'...",
                    flush=True,
                )
                candidate_urls = scraper_fn(q, remaining + 5)
                count = download_and_deduplicate(
                    candidate_urls,
                    out_dir=class_out_dir,
                    existing_hashes=existing_hashes,
                    min_size=args.min_size,
                    max_save=remaining,
                )
                engine_cat_saved += count
                total_saved += count
                print(
                    f"[Scraper] [{target_group}/{class_name}] [{eng}] '{q}' -> {len(candidate_urls)} URLs, +{count} saved ({eng}: {engine_cat_saved}/{per_engine_cap}, overall: {total_saved})",
                    flush=True,
                )

            print(
                f"[Scraper] [{target_group}/{class_name}] [{eng}] Completed: {engine_cat_saved}/{per_engine_cap} saved",
                flush=True,
            )

    print(f"\n[OK] Scraping finished! Total unique images saved: {total_saved}", flush=True)
    print(f"[->] Output folder: {raw_root}", flush=True)
    print("[->] Next step: Run Step 2 (CLIP Auto-Filter) to filter & sort images.", flush=True)


if __name__ == "__main__":
    main()

