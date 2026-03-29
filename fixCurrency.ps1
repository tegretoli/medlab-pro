$srcDir = "C:\Users\PC\Desktop\medlab-pro-v3\medlab-pro\frontend\src"
$files = Get-ChildItem $srcDir -Recurse -Filter "*.jsx"
foreach ($f in $files) {
  $c = [IO.File]::ReadAllText($f.FullName)
  $n = $c.Replace("toLocaleString()} L", "toLocaleString()} €")
  $n = $n.Replace(".toLocaleString()} L`"", ".toLocaleString()} €`"")
  if ($c -ne $n) {
    [IO.File]::WriteAllText($f.FullName, $n, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $($f.Name)"
  }
}
Write-Host "Done."
