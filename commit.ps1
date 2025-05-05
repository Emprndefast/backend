# commit.ps1
param (
    [string]$mensaje = "Actualización rápida"
)

git status
git add .
git commit -m $mensaje
git push
