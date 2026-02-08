"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "src:bg-background src:group/calendar src:p-3 src:[--cell-size:--spacing(8)] src:[[data-slot=card-content]_&]:bg-transparent src:[[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("src:w-fit", defaultClassNames.root),
        months: cn(
          "src:flex src:gap-4 src:flex-col src:md:flex-row src:relative",
          defaultClassNames.months,
        ),
        month: cn(
          "src:flex src:flex-col src:w-full src:gap-4",
          defaultClassNames.month,
        ),
        nav: cn(
          "src:flex src:items-center src:gap-1 src:w-full src:absolute src:top-0 src:inset-x-0 src:justify-between",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "src:size-(--cell-size) src:aria-disabled:opacity-50 src:p-0 src:select-none",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "src:size-(--cell-size) src:aria-disabled:opacity-50 src:p-0 src:select-none",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "src:flex src:items-center src:justify-center src:h-(--cell-size) src:w-full src:px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "src:w-full src:flex src:items-center src:text-sm src:font-medium src:justify-center src:h-(--cell-size) src:gap-1.5",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "src:relative src:has-focus:border-ring src:border src:border-input src:shadow-xs src:has-focus:ring-ring/50 src:has-focus:ring-[3px] src:rounded-md",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "src:absolute src:bg-popover src:inset-0 src:opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "src:select-none src:font-medium",
          captionLayout === "label"
            ? "src:text-sm"
            : "src:rounded-md src:ps-2 src:pe-1 src:flex src:items-center src:gap-1 src:text-sm src:h-8 src:[&>svg]:text-muted-foreground src:[&>svg]:size-3.5",
          defaultClassNames.caption_label,
        ),
        table: "src:w-full src:border-collapse",
        weekdays: cn("src:flex", defaultClassNames.weekdays),
        weekday: cn(
          "src:text-muted-foreground src:rounded-md src:flex-1 src:font-normal src:text-[0.8rem] src:select-none",
          defaultClassNames.weekday,
        ),
        week: cn("src:flex src:w-full src:mt-2", defaultClassNames.week),
        week_number_header: cn(
          "src:select-none src:w-(--cell-size)",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "src:text-[0.8rem] src:select-none src:text-muted-foreground",
          defaultClassNames.week_number,
        ),
        day: cn(
          "src:relative src:w-full src:h-full src:p-0 src:text-center src:[&:last-child[data-selected=true]_button]:rounded-e-md src:group/day src:aspect-square src:select-none",
          props.showWeekNumber
            ? "src:[&:nth-child(2)[data-selected=true]_button]:rounded-s-md"
            : "src:[&:first-child[data-selected=true]_button]:rounded-s-md",
          defaultClassNames.day,
        ),
        range_start: cn(
          "src:rounded-s-md src:bg-accent",
          defaultClassNames.range_start,
        ),
        range_middle: cn("src:rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "src:rounded-e-md src:bg-accent",
          defaultClassNames.range_end,
        ),
        today: cn(
          "src:bg-accent src:text-accent-foreground src:rounded-md src:data-[selected=true]:rounded-none",
          defaultClassNames.today,
        ),
        outside: cn(
          "src:text-muted-foreground src:aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "src:text-muted-foreground src:opacity-50",
          defaultClassNames.disabled,
        ),
        hidden: cn("src:invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn("src:size-4", className)}
                {...props}
              />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("src:size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon
              className={cn("src:size-4", className)}
              {...props}
            />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="src:flex src:size-(--cell-size) src:items-center src:justify-center src:text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "src:data-[selected-single=true]:bg-primary src:data-[selected-single=true]:text-primary-foreground src:data-[range-middle=true]:bg-accent src:data-[range-middle=true]:text-accent-foreground src:data-[range-start=true]:bg-primary src:data-[range-start=true]:text-primary-foreground src:data-[range-end=true]:bg-primary src:data-[range-end=true]:text-primary-foreground src:group-data-[focused=true]/day:border-ring src:group-data-[focused=true]/day:ring-ring/50 src:dark:hover:text-accent-foreground src:flex src:aspect-square src:size-auto src:w-full src:min-w-(--cell-size) src:flex-col src:gap-1 src:leading-none src:font-normal src:group-data-[focused=true]/day:relative src:group-data-[focused=true]/day:z-10 src:group-data-[focused=true]/day:ring-[3px] src:data-[range-end=true]:rounded-md src:data-[range-end=true]:rounded-e-md src:data-[range-middle=true]:rounded-none src:data-[range-start=true]:rounded-md src:data-[range-start=true]:rounded-s-md src:[&>span]:text-xs src:[&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
