/* eslint-disable react-hooks/purity */
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { PanelLeftIcon } from "lucide-react"
import { Slot } from "radix-ui"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open],
  )

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            "src:group/sidebar-wrapper src:has-data-[variant=inset]:bg-sidebar src:flex src:min-h-svh src:w-full",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "src:bg-sidebar src:text-sidebar-foreground src:flex src:h-full src:w-(--sidebar-width) src:flex-col",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="src:bg-sidebar src:text-sidebar-foreground src:w-(--sidebar-width) src:p-0 src:[&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="src:sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="src:flex src:h-full src:w-full src:flex-col">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      className="src:group src:peer src:text-sidebar-foreground src:hidden src:md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          "src:relative src:w-(--sidebar-width) src:bg-transparent src:transition-[width] src:duration-200 src:ease-linear",
          "src:group-data-[collapsible=offcanvas]:w-0",
          "src:group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "src:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
            : "src:group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          "src:fixed src:inset-y-0 src:z-10 src:hidden src:h-svh src:w-(--sidebar-width) src:transition-[left,right,width] src:duration-200 src:ease-linear src:md:flex",
          side === "left"
            ? "src:start-0 src:group-data-[collapsible=offcanvas]:start-[calc(var(--sidebar-width)*-1)]"
            : "src:end-0 src:group-data-[collapsible=offcanvas]:end-[calc(var(--sidebar-width)*-1)]",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "src:p-2 src:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
            : "src:group-data-[collapsible=icon]:w-(--sidebar-width-icon) src:group-data-[side=left]:border-e src:group-data-[side=right]:border-s",
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="src:bg-sidebar src:group-data-[variant=floating]:border-sidebar-border src:flex src:h-full src:w-full src:flex-col src:group-data-[variant=floating]:rounded-lg src:group-data-[variant=floating]:border src:group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("src:size-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="src:sr-only">Toggle Sidebar</span>
    </Button>
  )
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "src:hover:after:bg-sidebar-border src:absolute src:inset-y-0 src:z-20 src:hidden src:w-4 src:-translate-x-1/2 src:transition-all src:ease-linear src:group-data-[side=left]:-right-4 src:group-data-[side=right]:left-0 src:after:absolute src:after:inset-y-0 src:after:start-1/2 src:after:w-[2px] src:sm:flex",
        "src:in-data-[side=left]:cursor-w-resize src:in-data-[side=right]:cursor-e-resize",
        "src:[[data-side=left][data-state=collapsed]_&]:cursor-e-resize src:[[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "src:hover:group-data-[collapsible=offcanvas]:bg-sidebar src:group-data-[collapsible=offcanvas]:translate-x-0 src:group-data-[collapsible=offcanvas]:after:start-full",
        "src:[[data-side=left][data-collapsible=offcanvas]_&]:-end-2",
        "src:[[data-side=right][data-collapsible=offcanvas]_&]:-start-2",
        className,
      )}
      {...props}
    />
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "src:bg-background src:relative src:flex src:w-full src:flex-1 src:flex-col",
        "src:md:peer-data-[variant=inset]:m-2 src:md:peer-data-[variant=inset]:ms-0 src:md:peer-data-[variant=inset]:rounded-xl src:md:peer-data-[variant=inset]:shadow-sm src:md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ms-2",
        className,
      )}
      {...props}
    />
  )
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn(
        "src:bg-background src:h-8 src:w-full src:shadow-none",
        className,
      )}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("src:flex src:flex-col src:gap-2 src:p-2", className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("src:flex src:flex-col src:gap-2 src:p-2", className)}
      {...props}
    />
  )
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("src:bg-sidebar-border src:mx-2 src:w-auto", className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "src:flex src:min-h-0 src:flex-1 src:flex-col src:gap-2 src:overflow-auto src:group-data-[collapsible=icon]:overflow-hidden",
        className,
      )}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn(
        "src:relative src:flex src:w-full src:min-w-0 src:flex-col src:p-2",
        className,
      )}
      {...props}
    />
  )
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "src:text-sidebar-foreground/70 src:ring-sidebar-ring src:flex src:h-8 src:shrink-0 src:items-center src:rounded-md src:px-2 src:text-xs src:font-medium src:outline-hidden src:transition-[margin,opacity] src:duration-200 src:ease-linear src:focus-visible:ring-2 src:[&>svg]:size-4 src:[&>svg]:shrink-0",
        "src:group-data-[collapsible=icon]:-mt-8 src:group-data-[collapsible=icon]:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function SidebarGroupAction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(
        "src:text-sidebar-foreground src:ring-sidebar-ring src:hover:bg-sidebar-accent src:hover:text-sidebar-accent-foreground src:absolute src:top-3.5 src:end-3 src:flex src:aspect-square src:w-5 src:items-center src:justify-center src:rounded-md src:p-0 src:outline-hidden src:transition-transform src:focus-visible:ring-2 src:[&>svg]:size-4 src:[&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "src:after:absolute src:after:-inset-2 src:md:after:hidden",
        "src:group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  )
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("src:w-full src:text-sm", className)}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn(
        "src:flex src:w-full src:min-w-0 src:flex-col src:gap-1",
        className,
      )}
      {...props}
    />
  )
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("src:group/menu-item src:relative", className)}
      {...props}
    />
  )
}

const sidebarMenuButtonVariants = cva(
  "src:peer/menu-button src:flex src:w-full src:items-center src:gap-2 src:overflow-hidden src:rounded-md src:p-2 src:text-start src:text-sm src:outline-hidden src:ring-sidebar-ring src:transition-[width,height,padding] src:hover:bg-sidebar-accent src:hover:text-sidebar-accent-foreground src:focus-visible:ring-2 src:active:bg-sidebar-accent src:active:text-sidebar-accent-foreground src:disabled:pointer-events-none src:disabled:opacity-50 src:group-has-data-[sidebar=menu-action]/menu-item:pe-8 src:aria-disabled:pointer-events-none src:aria-disabled:opacity-50 src:data-[active=true]:bg-sidebar-accent src:data-[active=true]:font-medium src:data-[active=true]:text-sidebar-accent-foreground src:data-[state=open]:hover:bg-sidebar-accent src:data-[state=open]:hover:text-sidebar-accent-foreground src:group-data-[collapsible=icon]:size-8! src:group-data-[collapsible=icon]:p-2! src:[&>span:last-child]:truncate src:[&>svg]:size-4 src:[&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "src:hover:bg-sidebar-accent src:hover:text-sidebar-accent-foreground",
        outline:
          "src:bg-background src:shadow-[0_0_0_1px_hsl(var(--sidebar-border))] src:hover:bg-sidebar-accent src:hover:text-sidebar-accent-foreground src:hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "src:h-8 src:text-sm",
        sm: "src:h-7 src:text-xs",
        lg: "src:h-12 src:text-sm src:group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot.Root : "button"
  const { isMobile, state } = useSidebar()

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  )

  if (!tooltip) {
    return button
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip}
      />
    </Tooltip>
  )
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  showOnHover?: boolean
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        "src:text-sidebar-foreground src:ring-sidebar-ring src:hover:bg-sidebar-accent src:hover:text-sidebar-accent-foreground src:peer-hover/menu-button:text-sidebar-accent-foreground src:absolute src:top-1.5 src:end-1 src:flex src:aspect-square src:w-5 src:items-center src:justify-center src:rounded-md src:p-0 src:outline-hidden src:transition-transform src:focus-visible:ring-2 src:[&>svg]:size-4 src:[&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "src:after:absolute src:after:-inset-2 src:md:after:hidden",
        "src:peer-data-[size=sm]/menu-button:top-1",
        "src:peer-data-[size=default]/menu-button:top-1.5",
        "src:peer-data-[size=lg]/menu-button:top-2.5",
        "src:group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "src:peer-data-[active=true]/menu-button:text-sidebar-accent-foreground src:group-focus-within/menu-item:opacity-100 src:group-hover/menu-item:opacity-100 src:data-[state=open]:opacity-100 src:md:opacity-0",
        className,
      )}
      {...props}
    />
  )
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "src:text-sidebar-foreground src:pointer-events-none src:absolute src:end-1 src:flex src:h-5 src:min-w-5 src:items-center src:justify-center src:rounded-md src:px-1 src:text-xs src:font-medium src:tabular-nums src:select-none",
        "src:peer-hover/menu-button:text-sidebar-accent-foreground src:peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "src:peer-data-[size=sm]/menu-button:top-1",
        "src:peer-data-[size=default]/menu-button:top-1.5",
        "src:peer-data-[size=lg]/menu-button:top-2.5",
        "src:group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  )
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean
}) {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn(
        "src:flex src:h-8 src:items-center src:gap-2 src:rounded-md src:px-2",
        className,
      )}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="src:size-4 src:rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="src:h-4 src:max-w-(--skeleton-width) src:flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "src:border-sidebar-border src:mx-3.5 src:flex src:min-w-0 src:translate-x-px rtl:src:-translate-x-px src:flex-col src:gap-1 src:border-s src:px-2.5 src:py-0.5",
        "src:group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  )
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn("src:group/menu-sub-item src:relative", className)}
      {...props}
    />
  )
}

function SidebarMenuSubButton({
  asChild = false,
  size = "md",
  isActive = false,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean
  size?: "sm" | "md"
  isActive?: boolean
}) {
  const Comp = asChild ? Slot.Root : "a"

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "src:text-sidebar-foreground src:ring-sidebar-ring src:hover:bg-sidebar-accent src:hover:text-sidebar-accent-foreground src:active:bg-sidebar-accent src:active:text-sidebar-accent-foreground src:[&>svg]:text-sidebar-accent-foreground src:flex src:h-7 src:min-w-0 src:-translate-x-px rtl:src:translate-x-px src:items-center src:gap-2 src:overflow-hidden src:rounded-md src:px-2 src:outline-hidden src:focus-visible:ring-2 src:disabled:pointer-events-none src:disabled:opacity-50 src:aria-disabled:pointer-events-none src:aria-disabled:opacity-50 src:[&>span:last-child]:truncate src:[&>svg]:size-4 src:[&>svg]:shrink-0",
        "src:data-[active=true]:bg-sidebar-accent src:data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "src:text-xs",
        size === "md" && "src:text-sm",
        "src:group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}
