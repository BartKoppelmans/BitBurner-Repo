#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
; #Warn  ; Enable warnings to assist with detecting common errors.
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.

^i::

; MouseGetPos, xpos, ypos 
; MsgBox, The cursor is at X%xpos% Y%ypos%.

While (true) {

Send, !w
Click, 330 559 ; Go to mega corp
Click, 339 429 ; Go to the infiltration screen
Click, 54 666 ; Click start

Sleep, 60000 ; Sleep for a minute, we infiltrate here

Click, 149 437
    
}

return