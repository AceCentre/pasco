set -e

vuepress build docs

cd docs/.vuepress/dist

git init
git add -A
git commit -m 'deploy'

git push -f git@github.com:AceCentre/pasco.git master:gh-pages

cd -