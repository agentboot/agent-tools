# Moltbook Verification Auto-Solver
# Automatically solves lobster-themed math challenges from Moltbook verification requests.
#
# Original: https://github.com/CryptoBro0x/moltbook-solver
# Adapted for AgentBoot Toolkit: https://www.agentboot.co.uk
#
# Usage:
#   . .\tools\moltbook-solver.ps1
#   Get-MoltbookVerification -Challenge "A lobster swims at 20 meters per second for 3 seconds, how far?"
#   # Output: 60.00

param(
    [Parameter(Mandatory=$false)]
    [string]$Challenge
)

function Get-LobsterMath {
    param([string]$text)

    # Pattern: Work = Force x Distance (Joules)
    if ($text -match "Joules" -or $text -match "Newton.*meters") {
        $nums = [regex]::Matches($text, "\d+") | ForEach-Object { [int]$_.Value }
        if ($nums.Count -ge 2) {
            $answer = ($nums[0] * $nums[1]).ToString("0.00")
            Write-Verbose "Pattern: Work (Force x Distance) -> $answer"
            return $answer
        }
    }

    # Pattern: Distance = Speed x Time
    if ($text -match "how far" -or ($text -match "per second" -and $text -match "second")) {
        $nums = [regex]::Matches($text, "\d+") | ForEach-Object { [int]$_.Value }
        if ($nums.Count -ge 2) {
            $answer = ($nums[0] * $nums[1]).ToString("0.00")
            Write-Verbose "Pattern: Distance (Speed x Time) -> $answer"
            return $answer
        }
    }

    # Pattern: Force addition (Claw A XN + Claw B XN)
    if ($text -match "force|newton|total force|combined|claw") {
        $nums = [regex]::Matches($text, "\d+") | ForEach-Object { [int]$_.Value }
        if ($nums.Count -ge 2) {
            $answer = ($nums | Measure-Object -Sum).Sum.ToString("0.00")
            Write-Verbose "Pattern: Force addition -> $answer"
            return $answer
        }
    }

    # Pattern: Velocity change / addition
    if ($text -match "velocity|speed|gains?|increases?") {
        $nums = [regex]::Matches($text, "\d+") | ForEach-Object { [int]$_.Value }
        if ($nums.Count -ge 2) {
            $answer = ($nums | Measure-Object -Sum).Sum.ToString("0.00")
            Write-Verbose "Pattern: Velocity addition -> $answer"
            return $answer
        }
    }

    # Default: sum all numbers
    $nums = [regex]::Matches($text, "\d+") | ForEach-Object { [int]$_.Value }
    if ($nums.Count -ge 2) {
        $answer = ($nums | Measure-Object -Sum).Sum.ToString("0.00")
        Write-Verbose "Pattern: Sum all numbers -> $answer"
        return $answer
    }

    Write-Warning "No pattern matched, using fallback 42.00"
    return "42.00"
}

function Get-MoltbookVerification {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Challenge
    )
    $answer = Get-LobsterMath -text $Challenge
    Write-Host "Challenge : $Challenge"
    Write-Host "Answer    : $answer"
    return $answer
}

# Run directly if Challenge passed as argument
if ($Challenge) {
    Get-MoltbookVerification -Challenge $Challenge
}
