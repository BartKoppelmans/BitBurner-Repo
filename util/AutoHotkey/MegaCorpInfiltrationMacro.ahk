#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
; #Warn  ; Enable warnings to assist with detecting common errors.
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.

^i::

;MouseGetPos, xpos, ypos
;MsgBox, The cursor is at X%xpos% Y%ypos%.
;return

While (true) {

    Send, !w
    Click, 330 559 ; Go to mega corp
    Click, 339 429 ; Go to the infiltration screen
    Click, 73 768 ; Click start

    While (true) {
        Sleep, 1000 ; Sleep for a minute, we infiltrate here

        ; Check whether the screen to end is showing
        ImageSearch, FoundX, FoundY, 9, 225, 442, 285, %A_ScriptDir%/InfiltrationSuccess.png
        if (ErrorLevel = 2)
            MsgBox Could not conduct the search.
        else if (ErrorLevel = 1)
            Continue
        else
            Break
    }
    Click, 149 437
}

return