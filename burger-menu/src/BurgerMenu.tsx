import React, { useEffect, useRef, useState } from 'react';
import {
  registerVevComponent,
  useEditorState,
  useGlobalStore,
  useMenu,
  useModel,
  useRoute,
  Icon,
  Link,
  Portal,
} from '@vev/react';
import styles from './BurgerMenu.module.css';
import icon from './icon.svg';

type Docking = 'left' | 'right' | 'top' | 'bottom';

type MenuItem = {
  key: string;
  title: string;
  link?: { mode: number; page?: string; [key: string]: any };
  children?: MenuItem[];
  settings?: { hidden?: boolean };
};

type Props = {
  menu?: string;
  docking?: Docking;
  openIcon?: any;
  closeIcon?: any;
  showInEditor?: boolean;
  hostRef: React.RefObject<HTMLElement>;
};

// Must match the animation duration in BurgerMenu.module.css.
const ANIMATION_MS = 350;

const DOCK_CLASS: Record<Docking, string> = {
  left: styles.left,
  right: styles.right,
  top: styles.top,
  bottom: styles.bottom,
};

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Link passes extra props (onClick, aria-*) to the <a>, but its type does not declare them.
const VevLink = Link as React.ComponentType<any>;

const visibleItems = (items?: MenuItem[]) => (items || []).filter((item) => !item.settings?.hidden);

const isCurrentPage = (item: MenuItem, pageKey?: string) =>
  !!pageKey && item.link?.mode === 0 && item.link.page === pageKey;

const containsCurrentPage = (item: MenuItem, pageKey?: string): boolean =>
  isCurrentPage(item, pageKey) ||
  visibleItems(item.children).some((child) => containsCurrentPage(child, pageKey));

// The icon field stores { key, name, path: [width, height, d] }. Icon only draws the bare path
// array; given the whole object it falls through to an image branch and crashes.
const iconSource = (value: any) => (value && Array.isArray(value.path) ? value.path : value);

const BurgerIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

type ItemProps = {
  item: MenuItem;
  pageKey?: string;
  forceOpen: boolean;
  onNavigate: () => void;
};

function Item({ item, pageKey, forceOpen, onNavigate }: ItemProps) {
  const children = visibleItems(item.children);
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState(() => hasChildren && containsCurrentPage(item, pageKey));
  const open = expanded || forceOpen;
  const current = isCurrentPage(item, pageKey);
  const linkCl = styles.link + (current ? ' ' + styles.active : '');

  return (
    <li className={styles.item}>
      <div className={styles.row}>
        {item.link ? (
          <VevLink
            to={item.link}
            className={linkCl}
            aria-current={current ? 'page' : undefined}
            onClick={onNavigate}
          >
            {item.title}
          </VevLink>
        ) : (
          <span className={linkCl}>{item.title}</span>
        )}
        {hasChildren && (
          <button
            type="button"
            className={styles.expand}
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} ${item.title} submenu`}
            onClick={() => setExpanded(!expanded)}
          >
            <svg viewBox="0 0 10 6" aria-hidden="true">
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        )}
      </div>
      {hasChildren && (
        <ul className={styles.submenu} hidden={!open}>
          {children.map((child) => (
            <Item
              key={child.key}
              item={child}
              pageKey={pageKey}
              forceOpen={forceOpen}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

const BurgerMenu = ({
  menu: menuKey,
  docking = 'left',
  openIcon,
  closeIcon,
  showInEditor,
  hostRef,
}: Props) => {
  const menu = useMenu(menuKey);
  const route = useRoute();
  const model = useModel();
  const { disabled } = useEditorState();
  const storePkg = useGlobalStore((state: any) => state.pkg?.[model?.type], [model?.type]);
  const [domPkg, setDomPkg] = useState('');
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const focusOnOpen = useRef(false);

  const items = visibleItems(menu?.children as MenuItem[]);
  const pageKey = route?.pageKey;
  const panelId = `${model?.key || 'burger'}-menu`;

  // Lets the drawer be styled on the editor canvas. Has no effect on the published page.
  const editingDrawer = disabled && !!showInEditor;
  const isOpen = open || editingDrawer;

  // CSS is scoped to the package class. The portal element does not always carry it, so add it
  // to the portal content. Read it from the host element when the store does not have it.
  useEffect(() => {
    if (storePkg) return;
    const match = hostRef?.current
      ?.querySelector('[class*="pkg-"]')
      ?.className.toString()
      .match(/pkg-\S+/);
    if (match) setDomPkg(match[0]);
  }, [storePkg, hostRef]);
  const pkgClass = storePkg ? `pkg-${storePkg}` : domPkg;

  useEffect(() => {
    if (isOpen) setPhase('open');
    else setPhase((phase) => (phase === 'closed' ? 'closed' : 'closing'));
  }, [isOpen]);

  useEffect(() => {
    if (phase !== 'closing') return;
    const timer = window.setTimeout(() => setPhase('closed'), ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  // Close after navigation.
  useEffect(() => setOpen(false), [pageKey]);

  // Close with Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const show = () => {
    focusOnOpen.current = true;
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    // Give focus back to the button when it was inside the drawer.
    if (panelRef.current?.contains(document.activeElement)) toggleRef.current?.focus();
  };

  // The portal renders its content and attaches it to the page a few frames after opening, so
  // wait until the close button is in the document before moving focus to it.
  useEffect(() => {
    if (phase !== 'open' || !focusOnOpen.current) return;
    let timer = 0;
    const focusClose = () => {
      const button = closeRef.current;
      if (button?.isConnected) {
        focusOnOpen.current = false;
        button.focus();
      } else {
        timer = window.setTimeout(focusClose, 16);
      }
    };
    focusClose();
    return () => window.clearTimeout(timer);
  }, [phase]);

  // Keep Tab inside the drawer while it is open.
  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null,
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const dockClass = DOCK_CLASS[docking] || styles.left;
  const phaseClass = phase === 'closing' ? styles.closing : styles.open;

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        aria-label={menu?.title ? `Open ${menu.title}` : 'Open menu'}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => (open ? close() : show())}
      >
        {openIcon ? <Icon d={iconSource(openIcon)} className={styles.icon} /> : <BurgerIcon />}
      </button>
      <Portal hide={phase === 'closed'} dock="left-right" className={pkgClass}>
        <div className={`${styles.layer} ${dockClass} ${phaseClass}`}>
          <div className={styles.backdrop} onClick={close} aria-hidden="true" />
          <div
            ref={panelRef}
            id={panelId}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label={menu?.title || 'Menu'}
            onKeyDown={onPanelKeyDown}
          >
            <button
              ref={closeRef}
              type="button"
              className={styles.close}
              aria-label="Close menu"
              onClick={close}
            >
              {closeIcon ? (
                <Icon d={iconSource(closeIcon)} className={styles.icon} />
              ) : (
                <CloseIcon />
              )}
            </button>
            <nav aria-label={menu?.title || 'Menu'}>
              {items.length ? (
                <ul className={styles.list}>
                  {items.map((item) => (
                    <Item
                      key={item.key}
                      item={item}
                      pageKey={pageKey}
                      forceOpen={editingDrawer}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </ul>
              ) : (
                disabled && (
                  <p className={styles.empty}>
                    Select a menu, or add pages to it, in the properties.
                  </p>
                )
              )}
            </nav>
          </div>
        </div>
      </Portal>
    </>
  );
};

// Full text controls for every style rule that holds text.
const TEXT_PROPS = [
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-transform',
  'text-decoration',
  'text-align',
] as const;

registerVevComponent(BurgerMenu, {
  name: 'Burger Menu',
  description: 'A menu button that opens the site menu in a drawer from any side of the screen.',
  icon,
  type: 'standard',
  size: { width: 48, height: 'auto' },
  props: [
    {
      name: 'menu',
      title: 'Menu',
      description: 'Uses the primary menu when empty.',
      type: 'menu',
    },
    {
      name: 'docking',
      title: 'Open from',
      type: 'select',
      initialValue: 'left',
      options: {
        display: 'dropdown',
        items: [
          { label: 'Left', value: 'left' },
          { label: 'Right', value: 'right' },
          { label: 'Top', value: 'top' },
          { label: 'Bottom', value: 'bottom' },
        ],
      },
    },
    { name: 'openIcon', title: 'Menu icon', type: 'icon' },
    { name: 'closeIcon', title: 'Close icon', type: 'icon' },
    {
      name: 'showInEditor',
      title: 'Show drawer in editor',
      description: 'Keeps the drawer open on the editor canvas so you can style it.',
      type: 'boolean',
      initialValue: false,
    },
  ],
  editableCSS: [
    {
      title: 'Menu button',
      selector: styles.toggle,
      properties: ['color', 'background', 'padding', 'border', 'border-radius'],
    },
    {
      title: 'Drawer',
      selector: styles.panel,
      properties: [
        ...TEXT_PROPS,
        'background',
        'width',
        'max-width',
        'height',
        'padding',
        'gap',
        'border-radius',
        'box-shadow',
      ],
    },
    {
      title: 'Backdrop',
      selector: styles.backdrop,
      properties: ['background', 'backdrop-filter'],
    },
    {
      title: 'Close button',
      selector: styles.close,
      properties: ['color', 'background', 'width', 'height', 'border-radius'],
    },
    {
      title: 'Item',
      selector: styles.link,
      properties: [...TEXT_PROPS, 'background', 'padding', 'border-bottom'],
    },
    {
      title: 'Divider',
      selector: styles.item,
      properties: ['border-bottom'],
    },
    {
      title: 'Item hover',
      selector: `.${styles.link}:hover`,
      properties: [...TEXT_PROPS, 'background'],
    },
    {
      title: 'Current page',
      selector: `.${styles.link}.${styles.active}`,
      properties: [...TEXT_PROPS, 'background'],
    },
    {
      title: 'Submenu',
      selector: styles.submenu,
      properties: [...TEXT_PROPS, 'background', 'padding'],
    },
  ],
});

export default BurgerMenu;
