param([string]$FrontendImage = 'aptis-frontend')
$ErrorActionPreference = 'Stop'
$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 10)
$prefix = "aptis-ipcheck-$suffix"
$network = "$prefix-net"
$upstream = "$prefix-backend"
$tunnel = "$prefix-tunnel"
$frontend = "$prefix-frontend"
$holder = "$prefix-old-peer"
$ownedContainers = @()
$networkCreated = $false
$fixture = (Resolve-Path (Join-Path $PSScriptRoot 'fixtures/client-ip-upstream.conf')).Path

function Invoke-TestDocker([string[]]$DockerArgs) {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue' # Windows PowerShell treats native stderr as errors.
    $output = & docker @DockerArgs 2>&1
    $dockerExit = $LASTEXITCODE
    $ErrorActionPreference = $previousPreference
    if ($dockerExit -ne 0) { throw "Docker failed: $($output -join [Environment]::NewLine)" }
    return ($output -join [Environment]::NewLine).Trim()
}
function Request-FromTunnel([string]$Source = $tunnel, [switch]$Ipv6) {
    $args = @('exec', $Source, 'wget', '-qO-',
        '--header=X-Aptis-Client-IP: 198.51.100.99',
        '--header=X-Forwarded-For: 198.51.100.98',
        '--header=CF-Connecting-IP: 203.0.113.42')
    if ($Ipv6) { $args += '--header=CF-Connecting-IPv6: 2001:db8:abcd:1234::42' }
    $args += 'http://frontend/api/v1/auth/config'
    return Invoke-TestDocker -DockerArgs $args
}
function Assert-Equal([string]$Actual, [string]$Expected) {
    if ($Actual -ne $Expected) { throw "Expected '$Expected', received '$Actual'" }
}
try {
    Invoke-TestDocker -DockerArgs @('network', 'create', $network) | Out-Null
    $networkCreated = $true
    $ownedContainers += $upstream
    Invoke-TestDocker -DockerArgs @('run', '-d', '--name', $upstream, '--network', $network, '--network-alias', 'backend',
        '--mount', "type=bind,source=$fixture,target=/etc/nginx/conf.d/default.conf,readonly", 'nginx:1.27-alpine') | Out-Null
    $ownedContainers += $tunnel
    Invoke-TestDocker -DockerArgs @('run', '-d', '--name', $tunnel, '--network', $network, '--network-alias', 'cloudflared', 'nginx:1.27-alpine') | Out-Null
    $ownedContainers += $frontend
    Invoke-TestDocker -DockerArgs @('run', '-d', '--name', $frontend, '--network', $network, '--network-alias', 'frontend', $FrontendImage) | Out-Null
    Start-Sleep -Seconds 2
    Invoke-TestDocker -DockerArgs @('exec', $frontend, 'nginx', '-t') | Out-Null
    Assert-Equal (Request-FromTunnel) '203.0.113.42|203.0.113.42|'
    Assert-Equal (Request-FromTunnel -Ipv6) '2001:db8:abcd:1234::42|2001:db8:abcd:1234::42|'
    Write-Output 'PASS trusted tunnel: real IPv4/IPv6 overwrite client-supplied IP headers.'

    $spoof = Invoke-TestDocker -DockerArgs @('run', '--rm', '--network', $network, 'nginx:1.27-alpine', 'wget', '-qO-',
        '--header=X-Aptis-Client-IP: 198.51.100.99', '--header=X-Forwarded-For: 198.51.100.98',
        '--header=CF-Connecting-IP: 203.0.113.42', 'http://frontend/api/v1/auth/config')
    $fields = $spoof -split '\|'
    if ($fields[0] -eq '203.0.113.42' -or $fields[0] -eq '198.51.100.99' -or $fields[0] -ne $fields[1]) { throw "Spoofed IP accepted: $spoof" }
    Write-Output 'PASS untrusted peer cannot spoof CF, XFF or the internal client-IP header.'

    $oldIp = Invoke-TestDocker -DockerArgs @('inspect', '-f', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', $tunnel)
    Invoke-TestDocker -DockerArgs @('rm', '-f', $tunnel) | Out-Null
    # Occupy the old address so a recreated tunnel receives a genuinely new IP.
    $ownedContainers += $holder
    Invoke-TestDocker -DockerArgs @('run', '-d', '--name', $holder, '--network', $network, '--ip', $oldIp, 'nginx:1.27-alpine') | Out-Null
    Invoke-TestDocker -DockerArgs @('run', '-d', '--name', $tunnel, '--network', $network, '--network-alias', 'cloudflared', 'nginx:1.27-alpine') | Out-Null
    Start-Sleep -Seconds 13
    Assert-Equal (Request-FromTunnel) '203.0.113.42|203.0.113.42|'
    Assert-Equal (Request-FromTunnel -Source $holder) "$oldIp|$oldIp|"
    Write-Output 'PASS recreated tunnel is trusted automatically; its old address loses trust.'
} finally {
    # Only generated, owned test resources; never touch production containers.
    $ErrorActionPreference = 'Continue'
    foreach ($container in $ownedContainers) {
        if (!$container.StartsWith("$prefix-")) { throw 'Unsafe cleanup target' }
        & docker rm -f $container 2>&1 | Out-Null
    }
    if ($networkCreated) { & docker network rm $network 2>&1 | Out-Null }
}
