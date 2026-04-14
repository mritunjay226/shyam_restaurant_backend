"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date
    setDate: (date?: Date) => void
    label?: string
    disabled?: any
    min?: Date
    align?: "start" | "center" | "end"
}

export function DatePicker({ date, setDate, label, disabled, min, align = "start" }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
            "group flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2 text-sm cursor-pointer shadow-sm hover:shadow-md hover:border-green-500/30 transition-all duration-300",
            !date && "text-gray-400"
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
            <CalendarIcon className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:text-green-600",
                date ? "text-green-600" : "text-gray-400"
            )} />
            <span className="truncate font-semibold uppercase text-[12px] tracking-tight text-gray-900">
                {date ? format(date, "PPP") : (label || "Pick a date")}
            </span>
        </div>
        
        {date && (
            <span 
                role="button"
                tabIndex={0}
                onClick={(e) => {
                    e.stopPropagation()
                    setDate(undefined)
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation()
                        setDate(undefined)
                    }
                }}
                className="p-1 hover:bg-red-50 rounded-full transition-colors text-gray-400 hover:text-red-600 pointer-events-auto"
            >
                <X size={14} />
            </span>
        )}
      </PopoverTrigger>

      <PopoverContent 
        align={align} 
        className="w-auto p-0 bg-transparent border-none shadow-none focus:ring-0"
        sideOffset={8}
      >
          <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={disabled}
              fromDate={min}
              initialFocus
              className="rounded-xl border shadow-2xl bg-white"
          />
      </PopoverContent>
    </Popover>
  )
}
