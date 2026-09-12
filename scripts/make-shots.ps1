Add-Type -AssemblyName System.Drawing

function New-TerminalShot {
    param(
        [string]$OutFile,
        [string]$Title,
        [array]$Lines   # each item: @{ Text = ''; Color = '#rrggbb' }
    )
    $font = New-Object System.Drawing.Font('Microsoft YaHei', 11)
    $bold = New-Object System.Drawing.Font('Microsoft YaHei', 11, [System.Drawing.FontStyle]::Bold)
    $padX = 18; $padTop = 46; $padBottom = 16; $lineH = 24
    $width = 1180
    $height = $padTop + $lineH * $Lines.Count + $padBottom
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.TextRenderingHint = 'ClearTypeGridFit'
    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#16161e'))
    $bar = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#1f1f2b'))
    $g.FillRectangle($bg, 0, 0, $width, $height)
    $g.FillRectangle($bar, 0, 0, $width, 34)
    foreach ($i in 0..2) {
        $c = @('#ff5f57', '#febc2e', '#28c840')[$i]
        $b = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($c))
        $g.FillEllipse($b, 16 + $i * 20, 12, 10, 10)
    }
    $tb = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#8a8a9a'))
    $g.DrawString($Title, $font, $tb, 80, 8)
    $y = $padTop
    foreach ($line in $Lines) {
        $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($line.Color))
        $g.DrawString($line.Text, $font, $brush, $padX, $y)
        $y += $lineH
    }
    $bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
}

$dir = Split-Path $PSScriptRoot -Parent
$assets = Join-Path $dir 'assets'
New-Item -ItemType Directory -Force $assets | Out-Null

$prompt = '#7aa2f7'; $dim = '#6b7089'; $text = '#c8cede'; $accent = '#9ece6a'; $json = '#bb9af7'

New-TerminalShot -OutFile (Join-Path $assets 'headless-demo.png') -Title 'dsh --profile headless' -Lines @(
    @{ Text = 'PS> dsh --profile headless "只回复两个字：收到"'; Color = $prompt },
    @{ Text = ''; Color = $text },
    @{ Text = 'dsh: reasoning:'; Color = $dim },
    @{ Text = 'The user''s last message is "妈妈加油" which means "Mom, keep going!" or "Come on, Mom!"'; Color = $dim },
    @{ Text = 'But the previous instruction was to reply with only two characters, "收到" (received).'; Color = $dim },
    @{ Text = ''; Color = $text },
    @{ Text = '收到'; Color = $accent }
)

New-TerminalShot -OutFile (Join-Path $assets 'session-event.png') -Title 'session.v3.jsonl — user/message event (seq 11)' -Lines @(
    @{ Text = '{'; Color = $text },
    @{ Text = '  "type": "user/message", "seq": 11,'; Color = $json },
    @{ Text = '  "data": {'; Color = $text },
    @{ Text = '    "role": "user",'; Color = $json },
    @{ Text = '    "content": [{ "type": "text", "text": "妈妈加油" }],'; Color = $accent },
    @{ Text = '    "source": {'; Color = $text },
    @{ Text = '      "kind": "plugin", "plugin": "mom-cheer", "form": "snapshot",'; Color = $json },
    @{ Text = '      "sections": [{ "name": "mom-cheer", "text": "妈妈加油" }]'; Color = $accent },
    @{ Text = '    }'; Color = $text },
    @{ Text = '  }, "surfaceOp": "append"'; Color = $json },
    @{ Text = '}'; Color = $text }
)

Write-Output "written: $assets"
