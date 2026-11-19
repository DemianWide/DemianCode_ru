#!/usr/bin/env python3
"""
Сборка папки dist/ для публикации на хостинге.

Что делает:
  1. Синхронизирует сайт_3/config.js из сайт_3/config.json.
  2. Копирует сайт в dist/, переименовав папки сайт_1/2/3 в site-1/2/3
     (кириллица в путях на хостингах часто ломает ссылки).
  3. Правит пути в data/site.js под новые имена.
  4. Кладёт send.php и send.config.example.php рядом с index.html сайта-визитки.
  5. Не копирует служебное: бэкапы, docs, tools, старый portfolio.html.
  6. Проверяет, что все демо-страницы на месте, и напоминает про недостающие картинки.

Запуск:  python tools/build_dist.py     (или двойной клик по build.bat)
Нужен только Python 3.8+, больше ничего не устанавливается.
"""
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
RENAME = {"сайт_1": "site-1", "сайт_2": "site-2", "сайт_3": "site-3"}
SKIP_TOP = {"_backup_originals", "dist", "tools", "docs", "serverless","Clients", ".github", "Reference", ".git", ".gitignore", "portfolio.html",
            "start.bat", "build.bat", "README.md", "image_prompts_sites.txt"}
SKIP_ANY = {"_originals", "server", "node_modules", "Thumbs.db", "README.txt", ".DS_Store"}

def out(msg=""):
    print(msg, flush=True)

def sync_config():
    src = ROOT / "сайт_3" / "config.json"
    dst = ROOT / "сайт_3" / "config.js"
    if not src.exists():
        return
    data = json.loads(src.read_text(encoding="utf-8"))
    text = ("/* Копия config.json для открытия двойным кликом (file://). "
            "Через сервер используется config.json. */\n"
            "window.__CONFIG__ = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
    dst.write_text(text, encoding="utf-8")
    out("  config.js синхронизирован с config.json")

def copy_tree(src: Path, dst: Path):
    dst.mkdir(parents=True, exist_ok=True)
    for item in sorted(src.iterdir()):
        if item.name in SKIP_ANY:
            continue
        target = dst / item.name
        if item.is_dir():
            copy_tree(item, target)
        else:
            shutil.copy2(item, target)

def main():
    out("Сборка dist/ ...")
    sync_config()
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    for item in sorted(ROOT.iterdir()):
        if item.name in SKIP_TOP:
            continue
        name = RENAME.get(item.name, item.name)
        if item.is_dir():
            copy_tree(item, DIST / name)
        else:
            shutil.copy2(item, DIST / name)

    # пути в данных сайта
    site_js = DIST / "data" / "site.js"
    s = site_js.read_text(encoding="utf-8")
    for old, new in RENAME.items():
        s = s.replace(old + "/", new + "/")
    site_js.write_text(s, encoding="utf-8")

    # серверная часть заявок
    srv = ROOT / "сайт_3" / "server"
    for f in ("send.php", "send.config.example.php"):
        if (srv / f).exists():
            shutil.copy2(srv / f, DIST / "site-3" / f)

    # проверки
    problems = []
    for href in re.findall(r'href:\s*"([^"]+)"', s):
        if href.startswith(("http", "#", "mailto:", "tel:")):
            continue
        if not (DIST / href).exists():
            problems.append(f"нет файла демо: {href}")
    hints = []
    if not (ROOT / "assets" / "img" / "me.jpg").exists():
        hints.append("нет assets/img/me.jpg (покажется буква «Д»)")
    for n in ("fieldcode", "storecrm", "findash"):
        if not (ROOT / "assets" / "img" / f"work-{n}.webp").exists():
            hints.append(f"нет assets/img/work-{n}.webp (будет живое превью страницы)")
    for n in ("avatar-owner", "product-headphones", "product-keyboard", "product-watch", "product-earbuds"):
        if not (ROOT / "сайт_1" / "img" / f"{n}.webp").exists():
            hints.append(f"нет сайт_1/img/{n}.webp (возьмётся фото с Unsplash)")
    for n in ("card-1", "card-2", "card-3"):
        if not (ROOT / "сайт_2" / "img" / f"{n}.webp").exists():
            hints.append(f"нет сайт_2/img/{n}.webp (карта нарисуется градиентом)")
    if "your-name" in s or "yourdomain" in s:
        hints.append("в data/site.js остались заглушки контактов (your-name / yourdomain)")

    total = sum(f.stat().st_size for f in DIST.rglob("*") if f.is_file())
    out(f"\nГотово: {DIST}")
    out(f"Размер: {total / 1024 / 1024:.1f} МБ. Загрузите СОДЕРЖИМОЕ папки dist на хостинг (не саму папку).")
    if problems:
        out("\nОШИБКИ:")
        for p in problems:
            out("  - " + p)
    if hints:
        out("\nНапоминания (не критично):")
        for h in hints:
            out("  - " + h)
    sys.exit(1 if problems else 0)

if __name__ == "__main__":
    main()
