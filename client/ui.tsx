// Fork's component system, built on DESIGN.md tokens. Presentational only:
// no data fetching here, so every piece renders in the /dev/components library.
//
//   Atoms      Button, TextLink, Input, Textarea, Tag, VoteButton, CheckCircle, Thumb, Icon
//   Molecules  Field, SearchField, MealTile, SuggestionRow, ListRow, EmptyState, SectionHeading
//   Organisms  DayPlan, AisleGroup, Sheet (shadcn/ui Drawer + Dialog, in components/ui/)
//   Templates  client/layout.tsx
import { Link } from "@spacefast/zero/client";
import { useEffect, useState } from "preact/hooks";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "./components/ui/drawer";
import { MealImage, caption, displayMd } from "./layout";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ========== atoms ==========

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const base = `inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium transition-opacity disabled:opacity-40 ${focus}`;
const sizes: Record<ButtonSize, string> = { md: "h-11 px-5 text-[15px]", sm: "h-9 px-3.5 text-[15px]" };
const variants: Record<ButtonVariant, string> = {
  primary: "bg-action text-on-action hover:opacity-85",
  secondary: "border border-line text-ink hover:bg-surface",
  ghost: "text-ink-muted hover:text-ink",
  danger: "bg-danger text-accent-foreground hover:opacity-85",
};

/** Class string for a button, for elements we don't render ourselves (sign-in buttons, Links). */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cx(base, sizes[size], variants[variant], variant === "ghost" && "px-3");
}

// Legacy names used across screens.
export const btn = cx(base, sizes.md);
export const btnPrimary = buttonClass("primary");
export const btnQuiet = buttonClass("secondary");
export const btnGhost = buttonClass("ghost");
export const input = "w-full rounded-[12px] bg-surface px-4 py-3 text-[17px] text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink";
export const card = "rounded-[12px] bg-surface p-4";
export const textLinkClass = "text-[15px] font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink";

export function Button({
  variant = "primary",
  size = "md",
  to,
  class: extra,
  children,
  ...rest
}: { variant?: ButtonVariant; size?: ButtonSize; to?: string; class?: string; children: any } & Record<string, any>) {
  const c = cx(buttonClass(variant, size), extra);
  if (to)
    return (
      <Link to={to} class={c} data-component="Button" {...rest}>
        {children}
      </Link>
    );
  return (
    <button class={c} data-component="Button" {...rest}>
      {children}
    </button>
  );
}

export function TextLink({ to, children }: { to: string; children: any }) {
  return (
    <Link to={to} class={textLinkClass} data-component="TextLink">
      {children}
    </Link>
  );
}

export function Input(props: Record<string, any>) {
  return <input {...props} class={cx(input, props.class)} />;
}

export function Textarea(props: Record<string, any>) {
  return <textarea rows={4} {...props} class={cx(input, "leading-relaxed", props.class)} />;
}

export function Tag({ tone = "accent", children }: { tone?: "accent" | "neutral"; children: any }) {
  return (
    <span
      data-component="Tag"
      class={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-medium leading-none",
        tone === "accent" ? "bg-accent text-accent-foreground" : "bg-surface-strong text-ink",
      )}
    >
      {children}
    </span>
  );
}

export function VoteButton({ count, active, onClick, label }: { count: number; active?: boolean; onClick?: () => void; label?: string }) {
  const Tagname: any = onClick ? "button" : "span";
  return (
    <Tagname
      data-component="VoteButton"
      {...(onClick ? { onClick, "aria-pressed": !!active, "aria-label": label ?? (active ? "Remove my vote" : "Vote for this") } : {})}
      class={cx(
        "inline-flex h-9 min-w-[3.25rem] items-center justify-center gap-1.5 rounded-full border px-3 text-[15px] font-medium tabular-nums transition-colors",
        active ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-muted",
        onClick && !active && "hover:text-ink",
        onClick && focus,
      )}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M6 2.5 10 8.5H2z" fill="currentColor" />
      </svg>
      {count}
      {!onClick ? <span class="sr-only">votes</span> : null}
    </Tagname>
  );
}

export function CheckCircle({ checked }: { checked: boolean }) {
  return (
    <span
      data-component="CheckCircle"
      class={cx(
        "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
        checked ? "border-accent bg-accent text-accent-foreground" : "border-line",
      )}
      aria-hidden="true"
    >
      {checked ? (
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      ) : null}
    </span>
  );
}

/** 56px meal thumbnail: the photo, or the meal's initial on a tile. */
export function Thumb({ title, photo }: { title: string; photo?: string | null }) {
  if (photo) return <MealImage id={photo} title={title} sizes="56px" widths={[112]} class="h-14 w-14 shrink-0 rounded-[8px]" />;
  return (
    <span data-component="Thumb" class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[8px] bg-surface-strong font-display text-[22px] font-medium text-ink" aria-hidden="true">
      {title.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

const ICONS: Record<string, string> = {
  week: "M4 7.5h16M8 3.5v3M16 3.5v3M5.5 5.5h13a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z",
  meals: "M7 3.5v17M4.5 3.5v5a2.5 2.5 0 0 0 5 0v-5M16.5 20.5v-17c-2 1-3.5 3.5-3.5 7 0 2 1 3 3.5 3",
  list: "M9.5 6.5h10M9.5 12h10M9.5 17.5h10M4.5 6.5l1 1 2-2M4.5 12l1 1 2-2M4.5 17.5l1 1 2-2",
  family: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.3 2.6 3.5 5.2",
  chevronLeft: "M14.5 5.5 8 12l6.5 6.5",
  chevronRight: "M9.5 5.5 16 12l-6.5 6.5",
  chevronDown: "M5.5 9.5 12 16l6.5-6.5",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5 10 17l9-10",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM15.5 15.5 20 20",
  chef: "M7 14.5v5h10v-5M7 14.5a4 4 0 0 1-.5-7.9 5.5 5.5 0 0 1 11 0 4 4 0 0 1-.5 7.9ZM7 17h10",
};
export const ICON_NAMES = Object.keys(ICONS);

export function Icon({ name, size = 24 }: { name: keyof typeof ICONS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={ICONS[name] ?? ""} />
    </svg>
  );
}

// ========== molecules ==========

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: any }) {
  return (
    <label class="flex flex-col gap-2" data-component="Field">
      <span class="text-[15px] font-medium text-ink">{label}</span>
      {children}
      {error ? (
        <span role="alert" class="text-[15px] text-danger">
          {error}
        </span>
      ) : hint ? (
        <span class="text-[15px] text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function SearchField({ value, onInput, placeholder }: { value: string; onInput: (v: string) => void; placeholder: string }) {
  return (
    <div class="relative w-full" data-component="SearchField">
      <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">
        <Icon name="search" size={18} />
      </span>
      <input type="search" class={cx(input, "pl-11")} placeholder={placeholder} value={value} onInput={(e) => onInput((e.target as HTMLInputElement).value)} />
    </div>
  );
}

/** Photo (or type tile) with a caption and meta line. The whole tile is the link. */
export function MealTile({
  title,
  photo,
  to,
  eyebrow,
  meta,
  tag,
  showTitle = true,
}: {
  title: string;
  photo?: string | null;
  to?: string;
  eyebrow?: string;
  meta?: string;
  tag?: string;
  showTitle?: boolean;
}) {
  const body = (
    <>
      <div class="relative">
        <MealImage id={photo ?? null} title={title} sizes="(min-width: 1024px) 270px, 50vw" widths={[400, 600]} class="aspect-[4/3] w-full rounded-[12px] transition-opacity group-hover:opacity-85" />
        {tag ? (
          <span class="absolute left-3 top-3">
            <Tag>{tag}</Tag>
          </span>
        ) : null}
      </div>
      {eyebrow ? <p class={cx("mt-3", caption)}>{eyebrow}</p> : null}
      {showTitle && photo ? <p class={cx(eyebrow ? "mt-0.5" : "mt-3", "text-[17px] font-semibold leading-snug md:text-[20px]")}>{title}</p> : null}
      {meta ? <p class={cx(eyebrow || (showTitle && photo) ? "mt-0.5" : "mt-3", "line-clamp-2 text-[15px] text-ink-muted")}>{meta}</p> : null}
    </>
  );
  return to ? (
    <Link to={to} class={cx("group block", focus, "rounded-[12px]")} data-component="MealTile">
      {body}
    </Link>
  ) : (
    <div data-component="MealTile">{body}</div>
  );
}

/** One suggested meal for a day: thumb, title, who suggested it, votes, and a pick action. */
export function SuggestionRow({
  title,
  meta,
  photo,
  votes,
  voted,
  picked,
  onVote,
  onPick,
  onOpen,
  open,
  children,
}: {
  title: string;
  meta: string;
  photo?: string | null;
  votes: number;
  voted?: boolean;
  picked?: boolean;
  onVote?: () => void;
  onPick?: () => void;
  onOpen?: () => void;
  open?: boolean;
  children?: any;
}) {
  return (
    <li class="border-b border-line" data-component="SuggestionRow">
      <div class="flex items-center gap-3 py-3 md:gap-4">
        <Thumb title={title} />
        <button class={cx("min-w-0 flex-1 text-left", focus, "rounded-[4px]")} onClick={onOpen} aria-expanded={onOpen ? !!open : undefined} disabled={!onOpen}>
          <span class="flex items-center gap-2">
            <span class="truncate text-[17px] font-medium">{title}</span>
            {picked ? (
              <span class="hidden sm:inline-flex">
                <Tag>Picked</Tag>
              </span>
            ) : null}
          </span>
          <span class="flex items-center gap-2">
            {picked ? (
              <span class="sm:hidden">
                <Tag>Picked</Tag>
              </span>
            ) : null}
            <span class="truncate text-[15px] text-ink-muted">{meta}</span>
          </span>
        </button>
        <VoteButton count={votes} active={voted} onClick={onVote} />
        {onPick ? (
          <Button variant={picked ? "ghost" : "secondary"} size="sm" onClick={onPick} aria-pressed={!!picked}>
            {picked ? "Unpick" : "Pick"}
          </Button>
        ) : null}
      </div>
      {open && children ? <div class="pb-4 pl-[68px] md:pl-[72px]">{children}</div> : null}
    </li>
  );
}

export function ListRow({ name, amount, detail, checked, onToggle, onRemove }: { name: string; amount?: string; detail?: string; checked: boolean; onToggle?: () => void; onRemove?: () => void }) {
  const content = (
    <>
      <CheckCircle checked={checked} />
      <span class="min-w-0 flex-1">
        <span class={cx("block truncate text-[17px]", checked && "text-ink-muted line-through")}>{name}</span>
        {detail ? <span class="block truncate text-[13px] text-ink-muted">{detail}</span> : null}
      </span>
      {amount ? <span class="shrink-0 text-[15px] tabular-nums text-ink-muted">{amount}</span> : null}
    </>
  );
  return (
    <li class="flex items-center border-b border-line" data-component="ListRow">
      {onToggle ? (
        <button class={cx("flex min-h-[52px] min-w-0 flex-1 items-center gap-3 py-2 text-left", focus)} onClick={onToggle} aria-pressed={checked}>
          {content}
        </button>
      ) : (
        <div class="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 py-2">{content}</div>
      )}
      {onRemove ? (
        <button class={cx("ml-1 flex h-11 w-9 shrink-0 items-center justify-center text-ink-muted hover:text-ink", focus)} aria-label={`Remove ${name}`} onClick={onRemove}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
        </button>
      ) : null}
    </li>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: any }) {
  return (
    <div class="max-w-[30rem] py-6" data-component="EmptyState">
      <p class="font-display text-[26px] font-medium leading-tight">{title}</p>
      {body ? <p class="mt-2 text-[17px] leading-relaxed text-ink-muted">{body}</p> : null}
      {action ? <div class="mt-6">{action}</div> : null}
    </div>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: any }) {
  return (
    <div class="mb-3 flex items-end justify-between gap-4" data-component="SectionHeading">
      <h2 class={displayMd}>{title}</h2>
      {action}
    </div>
  );
}

// ========== organisms ==========

/** One day of the week: heading, who's cooking, the suggestions, and a way to add one. */
export function DayPlan({
  day,
  date,
  isToday,
  chef,
  chefAction,
  children,
  footer,
}: {
  day: string;
  date: string;
  isToday?: boolean;
  chef?: string | null;
  chefAction?: any;
  children?: any;
  footer?: any;
}) {
  return (
    <section class="border-t border-line pt-6" data-component="DayPlan">
      <header class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 class="font-display text-[26px] font-medium leading-none tracking-[-0.01em] md:text-[32px]">
            {day} <span class="text-ink-muted">{date}</span>
          </h2>
          <p class={cx("mt-2 text-[15px]", chef ? "text-ink" : "text-ink-muted")}>
            {chef ? (
              <span class="inline-flex items-center gap-1.5">
                <span class={isToday ? "text-accent" : "text-ink-muted"}>
                  <Icon name="chef" size={18} />
                </span>
                {chef}
              </span>
            ) : (
              "No one's cooking yet"
            )}
          </p>
        </div>
        {chefAction}
      </header>
      {children ? <ul class="mt-3 border-t border-line">{children}</ul> : null}
      {footer ? <div class="mt-2">{footer}</div> : null}
    </section>
  );
}

export function AisleGroup({ aisle, children }: { aisle: string; children: any }) {
  return (
    <div class="mb-6 last:mb-0" data-component="AisleGroup">
      <p class={caption}>{aisle}</p>
      <ul class="mt-1">{children}</ul>
    </div>
  );
}

/** Class for each button in a Sheet's action row: equal widths on phones, natural width on desktop. */
export const sheetAction = "flex-1 md:flex-none";

/** True from 768px up, the same breakpoint as `md:`. */
function useDesktop() {
  const query = "(min-width: 768px)";
  const [desktop, setDesktop] = useState(() => typeof matchMedia !== "undefined" && matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setDesktop(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return desktop;
}

/**
 * A focused task over the screen, from shadcn/ui (Base UI underneath): a drag-to-dismiss
 * bottom Drawer on phones, a centered Dialog from 768px. Title and subtitle, the body, then
 * one row of actions. Swipe down, Esc, the scrim, or Cancel closes it.
 */
export function Sheet({
  open = true,
  title,
  subtitle,
  onClose,
  actions,
  onSubmit,
  children,
}: {
  open?: boolean;
  /** Makes the body and actions one form (the sheet renders in a portal, so a form around it wouldn't hold the buttons). */
  onSubmit?: (e: Event) => void;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Buttons for the bottom row. Give each `class={sheetAction}` so they share the width on phones. */
  actions?: any;
  children: any;
}) {
  const desktop = useDesktop();
  const onOpenChange = (next: boolean) => !next && onClose();
  const heading = "font-display text-[26px] font-medium leading-tight tracking-[-0.01em] text-ink";
  const sub = "text-[15px] text-ink-muted";
  // A tag name, not a component made here, so typing never remounts the fields.
  const Body: any = onSubmit ? "form" : "div";
  if (desktop)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 rounded-[20px] bg-canvas p-0 text-ink sm:max-w-[520px]" data-component="Sheet">
          <DialogHeader className="px-6 pb-2 pt-6">
            <DialogTitle className={heading}>{title}</DialogTitle>
            {subtitle ? <DialogDescription className={sub}>{subtitle}</DialogDescription> : null}
          </DialogHeader>
          <Body class="flex flex-col" onSubmit={onSubmit}>
            <div class="px-6 py-3">{children}</div>
            {actions ? <div class="flex justify-end gap-2 px-6 pb-6 pt-3">{actions}</div> : null}
          </Body>
        </DialogContent>
      </Dialog>
    );
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="rounded-t-[20px] bg-canvas text-ink" data-component="Sheet">
        <DrawerHeader className="px-5 pb-2 pt-3 text-left">
          <DrawerTitle className={heading}>{title}</DrawerTitle>
          {subtitle ? <DrawerDescription className={sub}>{subtitle}</DrawerDescription> : null}
        </DrawerHeader>
        <Body class="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
          <div class="flex-1 overflow-y-auto px-5 py-3">{children}</div>
          {actions ? <DrawerFooter className="flex-row gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">{actions}</DrawerFooter> : null}
        </Body>
      </DrawerContent>
    </Drawer>
  );
}
