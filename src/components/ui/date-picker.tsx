"use client";

import * as React from "react";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DatePickerProps = {
  /** Nome do input hidden (ex: para FormData) */
  name?: string;
  /** Data selecionada (controlado) */
  value?: Date;
  /** Data inicial (não controlado) */
  defaultValue?: Date;
  /** Chamado ao selecionar data */
  onSelect?: (date: Date | undefined) => void;
  /** Data mínima selecionável */
  minDate?: Date;
  /** Placeholder do botão */
  placeholder?: string;
  className?: string;
  /** Desabilitado */
  disabled?: boolean;
  /** Obrigatório (validação visual; use required no form) */
  required?: boolean;
};

export function DatePicker({
  name,
  value,
  defaultValue,
  onSelect,
  minDate,
  placeholder = "Escolher data",
  className,
  disabled,
  required,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(
    defaultValue
  );
  const hiddenInputRef = React.useRef<HTMLInputElement>(null);

  const isControlled = value !== undefined;
  const selectedDate = isControlled ? value : internalDate;

  const updateValue = React.useCallback(
    (date: Date | undefined) => {
      if (!isControlled) setInternalDate(date);
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = date ? format(date, "yyyy-MM-dd") : "";
      }
      onSelect?.(date);
    },
    [isControlled, onSelect]
  );

  React.useEffect(() => {
    const initial = isControlled ? value : internalDate ?? defaultValue;
    if (hiddenInputRef.current && initial) {
      hiddenInputRef.current.value = format(initial, "yyyy-MM-dd");
    }
  }, [isControlled, value, internalDate, defaultValue]);

  return (
    <div className={cn("relative", className)}>
      {name && (
        <input
          ref={hiddenInputRef}
          type="hidden"
          name={name}
          defaultValue={
            defaultValue ? format(defaultValue, "yyyy-MM-dd") : undefined
          }
        />
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!selectedDate}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {selectedDate ? (
              format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              updateValue(date);
              setOpen(false);
            }}
            disabled={
              minDate
                ? (date) => date < startOfDay(minDate)
                : undefined
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
