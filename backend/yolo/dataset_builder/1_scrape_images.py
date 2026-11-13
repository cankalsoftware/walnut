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
        ],
        "walnut_in_hull": [
            "fallen green walnut hull on ground",
            "walnut in split green husk on ground",
            "black and green walnut hulls fallen on grass",
            "juglans regia fallen nuts with husks on soil",
        ],
    },
    "canopy": {
        "walnut_hull_split": [
            "walnut hull split on tree branch",
            "ripening walnut green husk cracking on tree",
            "juglans regia hull split harvest readiness",
        ],
        "walnut_blight_damaged": [
            "walnut blight xanthomonas arboricola fruit damage",
            "walnut husk fly blackened walnut on tree",
            "diseased blighted walnut on tree branch",
        ],
        "walnut_green": [
            "green walnuts growing on tree branch",
            "juglans regia green fruit cluster canopy",
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


def download_and_deduplicate(
    urls: Iterable[str],
    out_dir: Path,
    existing_hashes: set[str],
    min_size: int = 300,
) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    saved = 0

    for url in urls:
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
        choices=["all", "bing", "ddg", "flickr"],
        default="all",
        help="Search engine to use (default: 'all')",
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
    args = parser.parse_args()

    builder_root = Path(__file__).resolve().parent
    raw_root = builder_root / "raw_scraped"

    targets = ["ground", "canopy"] if args.target == "all" else [args.target]
    existing_hashes: set[str] = set()
    total_saved = 0

    for target_group in targets:
        class_map = DEFAULT_SCRAPE_QUERIES[target_group]
        for class_name, queries in class_map.items():
            class_out_dir = raw_root / target_group / class_name
            print(f"\n[Scraper] Target: {target_group}/{class_name}")

            for q in queries:
                candidate_urls: list[str] = []
                if args.engine in ("all", "bing"):
                    candidate_urls.extend(scrape_bing_html(q, args.max_per_query))
                if args.engine in ("all", "ddg"):
                    candidate_urls.extend(scrape_duckduckgo(q, args.max_per_query))
                if args.engine in ("all", "flickr"):
                    candidate_urls.extend(scrape_flickr_api(q, args.max_per_query))

                count = download_and_deduplicate(
                    candidate_urls,
                    out_dir=class_out_dir,
                    existing_hashes=existing_hashes,
                    min_size=args.min_size,
                )
                total_saved += count
                print(f"  Query: '{q}' -> +{count} verified unique images")

    print(f"\n[✓] Scraping finished! Total unique images saved: {total_saved}")
    print(f"[→] Output folder: {raw_root}")
    print("[→] Next step: Run `python yolo/dataset_builder/2_clip_filter_and_classify.py` to auto-filter with CLIP!")


if __name__ == "__main__":
    main()

