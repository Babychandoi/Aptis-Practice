#!/usr/bin/env python3
"""Export the independently deployable IELTS project into a NEW directory."""
import argparse
import shutil
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('destination', help='New directory, must not exist')
args = parser.parse_args()
source = Path(__file__).resolve().parents[1]
destination = Path(args.destination).expanduser().resolve()
if destination.exists() or source == destination or source in destination.parents:
    parser.error('Destination must be new and outside the source repository')
destination.mkdir(parents=True)
ignore = shutil.ignore_patterns('node_modules', 'dist', 'target', '.git', '.env', '*.tsbuildinfo')
shutil.copytree(source / 'aptis-backend', destination / 'backend', ignore=ignore)
shutil.copytree(source / 'ielts-frontend', destination / 'frontend', ignore=ignore)
shutil.copytree(source / 'docs/ielts', destination / 'docs')
compose = (source / 'docker-compose.ielts.yml').read_text()
(destination / 'docker-compose.yml').write_text(compose.replace('./aptis-backend', './backend').replace('./ielts-frontend', './frontend'))
readme = (source / 'README-IELTS.md').read_text()
readme = readme.replace('docker compose -f docker-compose.ielts.yml', 'docker compose')
readme = readme.replace('ielts-frontend', 'frontend').replace('aptis-backend', 'backend').replace('docs/ielts/', 'docs/')
(destination / 'README.md').write_text(readme)
(destination / '.gitignore').write_text('node_modules/\ndist/\ntarget/\n.env\n*.tsbuildinfo\n.idea/\n.vscode/\n')
print(f'Exported IELTS project to {destination}')
