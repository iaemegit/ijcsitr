param([string]$LoginPath = 'ijcsitr-migration', [switch]$VerifyOnly)
$ErrorActionPreference = 'Stop'
$mysql = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'
function Invoke-Database([string]$Sql, [switch]$NoDatabase) {
    $start = New-Object Diagnostics.ProcessStartInfo
    $start.FileName = $mysql
    $start.Arguments = "--login-path=$LoginPath --default-character-set=utf8mb4 --batch --raw --skip-column-names --binary-mode"
    if (!$NoDatabase) { $start.Arguments += ' --database=ijcsitr' }
    $start.UseShellExecute = $false
    $start.RedirectStandardInput = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    # Input SQL is ASCII; data values are represented as UTF-8 hex literals.
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $start
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    $process.StandardInput.Write($Sql)
    $process.StandardInput.Close()
    $process.WaitForExit()
    $outText = $stdout.Result
    $errText = $stderr.Result
    if ($process.ExitCode -ne 0) { throw "MySQL failed: $errText" }
    if ($errText.Trim()) { Write-Warning $errText }
    return $outText
}
$count = Invoke-Database "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='ijcsitr';" -NoDatabase
if (!$VerifyOnly -and [int]$count.Trim() -ne 0) { throw 'Target ijcsitr is not empty; no import performed.' }
$sql = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'ijcsitr-mysql.sql'))
$expected = Import-Clixml (Join-Path $PSScriptRoot 'migration-expected.xml')
if (!$VerifyOnly) { [void](Invoke-Database $sql) }
$utf8 = New-Object Text.UTF8Encoding($false)
$results = @()
foreach ($name in ($expected.Keys | Sort-Object)) {
    $table = $expected[$name]
    $columns = @($table.Columns)
    $typesText = Invoke-Database ("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='ijcsitr' AND table_name='$name' ORDER BY ordinal_position;")
    $types = @{}
    foreach ($typeLine in ($typesText.TrimEnd() -split '\r?\n')) { $parts = $typeLine.Split([char]9); $types[$parts[0]] = $parts[1] }
    $expressions = $columns | ForEach-Object { 'IFNULL(HEX(CAST(`' + $_ + '` AS CHAR CHARACTER SET utf8mb4)),''NULL'')' }
    $query = 'SELECT ' + ($expressions -join ',') + ' FROM `' + $name + '` ORDER BY `' + $table.PrimaryKey + '`;'
    $actualText = Invoke-Database $query
    $actualRows = @()
    $actualText = $actualText.TrimEnd([char[]]"`r`n")
    if ($actualText.Length) { $actualRows = @($actualText -split '\r?\n') }
    $pkIndex = [array]::IndexOf($columns, $table.PrimaryKey)
    $expectedRows = @($table.Rows | Sort-Object { [long]$_[$pkIndex] })
    if ($actualRows.Count -ne $expectedRows.Count) { throw "Row count mismatch in $name" }
    $verifiedCells = 0
    for ($rowIndex = 0; $rowIndex -lt $expectedRows.Count; $rowIndex++) {
        $hexFields = $actualRows[$rowIndex].Split([char]9)
        if ($hexFields.Count -ne $columns.Count) { throw "Field count mismatch: $name row $rowIndex" }
        for ($colIndex = 0; $colIndex -lt $columns.Count; $colIndex++) {
            $expectedValue = $expectedRows[$rowIndex][$colIndex]
            $hex = $hexFields[$colIndex]
            if ($hex -eq 'NULL') { $actualValue = $null }
            else {
                $bytes = New-Object byte[] ($hex.Length / 2)
                for ($byteIndex = 0; $byteIndex -lt $bytes.Length; $byteIndex++) { $bytes[$byteIndex] = [Convert]::ToByte($hex.Substring($byteIndex * 2,2),16) }
                $actualValue = $utf8.GetString($bytes)
            }
            $equal = $false
            if ($null -eq $expectedValue -or $null -eq $actualValue) { $equal = ($null -eq $expectedValue -and $null -eq $actualValue) }
            elseif ($types[$columns[$colIndex]] -eq 'datetime') {
                $equal = ([datetime]::Parse($expectedValue, [Globalization.CultureInfo]::InvariantCulture) -eq [datetime]::Parse($actualValue, [Globalization.CultureInfo]::InvariantCulture))
            }
            elseif ($types[$columns[$colIndex]] -eq 'double') {
                $equal = ([double]::Parse($expectedValue,[Globalization.CultureInfo]::InvariantCulture) -eq [double]::Parse($actualValue,[Globalization.CultureInfo]::InvariantCulture))
            }
            else { $equal = [string]::Equals($expectedValue,$actualValue,[StringComparison]::Ordinal) }
            if (!$equal) { throw "Value mismatch in $name, row $rowIndex, column $($columns[$colIndex]); values omitted for privacy." }
            $verifiedCells++
        }
    }
    $results += [pscustomobject]@{ Table = $name; Rows = $actualRows.Count; VerifiedCells = $verifiedCells; Result = 'PASS' }
}
$results | ConvertTo-Json | Set-Content (Join-Path $PSScriptRoot 'migration-validation.json') -Encoding UTF8
$results | Format-Table -AutoSize
Write-Output ('Verified total rows: ' + (($results | Measure-Object Rows -Sum).Sum))
Write-Output ('Verified total cells: ' + (($results | Measure-Object VerifiedCells -Sum).Sum))
