"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion } from "framer-motion"

interface AuthSwitchProps {
  mode: "login" | "register"
  onModeChange: (mode: "login" | "register") => void
}

export default function AuthSwitch({ mode, onModeChange }: AuthSwitchProps) {
  return (
    <div className="relative flex w-full rounded-xl bg-muted/60 p-1 backdrop-blur-sm">
      {/* Sliding indicator */}
      <div
        className={cn(
          "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-all duration-300 ease-out dark:bg-zinc-800",
          mode === "register" ? "left-[calc(50%+2px)]" : "left-1"
        )}
      />

      <button
        type="button"
        onClick={() => onModeChange("login")}
        className={cn(
          "relative z-10 flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors duration-200",
          mode === "login"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground/80"
        )}
      >
        Anmelden
      </button>
      <button
        type="button"
        onClick={() => onModeChange("register")}
        className={cn(
          "relative z-10 flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors duration-200",
          mode === "register"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground/80"
        )}
      >
        Registrieren
      </button>
    </div>
  )
}
