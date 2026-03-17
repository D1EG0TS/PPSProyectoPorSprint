from pathlib import Path

from PIL import Image


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    src = repo_root / "frontend" / "assets" / "isologo_desarrollado.webp"
    dst = repo_root / "frontend" / "assets" / "isologo_desarrollado.png"

    img = Image.open(src)
    img.save(dst, format="PNG")


if __name__ == "__main__":
    main()
