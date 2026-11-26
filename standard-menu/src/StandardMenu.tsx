import React, { useCallback, useEffect, useRef, useState } from 'react';
import { registerVevComponent, useEditorState, useMenu, useRoute, Link } from '@vev/react';
import styles from './StandardMenu.module.css';
import icon from './icon.svg';

type MenuItem = {
  key: string;
  title: string;
  link?: { mode: number; page?: string; [key: string]: any };
  children?: MenuItem[];
  settings?: { hidden?: boolean };
};

type Props = {
  menu?: string;
  showInEditor?: boolean;
  hostRef: React.RefObject<HTMLElement>;
};

// Delay before a dropdown closes when the pointer leaves, so the pointer can cross small gaps.
const CLOSE_DELAY = 150;

// Link passes extra props (onClick, aria-*) to the <a>, but its type does not declare them.
const VevLink = Link as React.ComponentType<any>;

const visibleItems = (items?: MenuItem[]) => (items || []).filter((item) => !item.settings?.hidden);

const isCurrentPage = (item: MenuItem, pageKey?: string) =>
  !!pageKey && item.link?.mode === 0 && item.link.page === pageKey;

const containsCurrentPage = (item: MenuItem, pageKey?: string): boolean =>
  isCurrentPage(item, pageKey) ||
  visibleItems(item.children).some((child) => containsCurrentPage(child, pageKey));

type EntryProps = {
  item: MenuItem;
  path: string[];
  openPath: string[];
  pageKey?: string;
  onOpen: (path: string[]) => void;
  onFocusOpen: (path: string[]) => void;
};

function Entry({ item, path, openPath, pageKey, onOpen, onFocusOpen }: EntryProps) {
  const depth = path.length - 1;
  const children = visibleItems(item.children);
  const hasChildren = children.length > 0;
  const open = hasChildren && openPath[depth] === item.key;
  const current = isCurrentPage(item, pageKey);
  // Only items with a dropdown go into the open path. A leaf keeps its parent's dropdown open.
  const ownPath = hasChildren ? path : path.slice(0, -1);

  let linkCl = depth === 0 ? styles.link : styles.dropdownLink;
  if (current || (hasChildren && containsCurrentPage(item, pageKey))) linkCl += ' ' + styles.active;

  const label = item.link ? (
    <VevLink
      to={item.link}
      className={linkCl}
      data-key={item.key}
      aria-current={current ? 'page' : undefined}
      onFocus={() => onFocusOpen(ownPath)}
    >
      {item.title}
    </VevLink>
  ) : (
    <span className={linkCl} data-key={item.key} tabIndex={0} onFocus={() => onFocusOpen(ownPath)}>
      {item.title}
    </span>
  );

  return (
    <li
      className={depth === 0 ? styles.item : styles.dropdownItem}
      onMouseEnter={() => onOpen(ownPath)}
    >
      {label}
      {hasChildren && (
        <>
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} ${item.title} submenu`}
            onClick={() => onOpen(open ? path.slice(0, -1) : path)}
          >
            <svg viewBox="0 0 10 6" aria-hidden="true">
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <ul
            className={styles.dropdown + (depth > 0 ? ' ' + styles.nested : '')}
            data-open={open || undefined}
          >
            {children.map((child) => (
              <Entry
                key={child.key}
                item={child}
                path={[...path, child.key]}
                openPath={openPath}
                pageKey={pageKey}
                onOpen={onOpen}
                onFocusOpen={onFocusOpen}
              />
            ))}
          </ul>
        </>
      )}
    </li>
  );
}

const StandardMenu = ({ menu: menuKey, showInEditor, hostRef }: Props) => {
  const menu = useMenu(menuKey);
  const route = useRoute();
  const { disabled } = useEditorState();
  const [openPath, setOpenPath] = useState<string[]>([]);
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number>();
  // Set while Escape moves focus back to a parent link, so that focus does not reopen it.
  const skipFocusOpen = useRef(false);

  const items = visibleItems(menu?.children as MenuItem[]);
  const pageKey = route?.pageKey;

  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const open = useCallback((path: string[]) => {
    window.clearTimeout(closeTimer.current);
    setOpenPath(path);
  }, []);
  const openFromFocus = useCallback(
    (path: string[]) => {
      if (skipFocusOpen.current) skipFocusOpen.current = false;
      else open(path);
    },
    [open],
  );

  // Lets the first dropdown be styled on the editor canvas. Has no effect on the published page.
  const editingDropdown = disabled && !!showInEditor;
  const firstWithChildren = items.find((item) => visibleItems(item.children).length);
  const effectivePath =
    editingDropdown && firstWithChildren && !openPath.length ? [firstWithChildren.key] : openPath;

  // Dropdowns overflow the element box, so lift it above its siblings while one is open.
  useEffect(() => {
    const host = hostRef?.current;
    if (!host) return;
    host.style.zIndex = effectivePath.length ? '5' : '';
  }, [effectivePath.length, hostRef]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Close when the user taps or clicks anywhere outside the menu.
  useEffect(() => {
    if (!openPath.length) return;
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenPath([]);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openPath.length]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape' || !openPath.length) return;
    const parentKey = openPath[openPath.length - 1];
    setOpenPath(openPath.slice(0, -1));
    const parent = navRef.current?.querySelector<HTMLElement>(`[data-key="${parentKey}"]`);
    if (parent && parent !== document.activeElement) {
      skipFocusOpen.current = true;
      parent.focus();
    }
  };

  const onBlur = (e: React.FocusEvent) => {
    if (!navRef.current?.contains(e.relatedTarget as Node)) setOpenPath([]);
  };

  if (!items.length) {
    if (!disabled) return null;
    return (
      <div className={styles.empty}>Select a menu, or add pages to it, in the properties.</div>
    );
  }

  return (
    <nav
      ref={navRef}
      className={styles.nav}
      aria-label={menu?.title || 'Menu'}
      onMouseEnter={cancelClose}
      onMouseLeave={() => {
        closeTimer.current = window.setTimeout(() => setOpenPath([]), CLOSE_DELAY);
      }}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <ul className={styles.menu}>
        {items.map((item) => (
          <Entry
            key={item.key}
            item={item}
            path={[item.key]}
            openPath={effectivePath}
            pageKey={pageKey}
            onOpen={open}
            onFocusOpen={openFromFocus}
          />
        ))}
      </ul>
    </nav>
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

registerVevComponent(StandardMenu, {
  name: 'Standard Menu',
  description: 'A horizontal or vertical navigation menu with dropdowns for sub-pages.',
  icon,
  type: 'standard',
  size: { width: 600, height: 'auto' },
  props: [
    {
      name: 'menu',
      title: 'Menu',
      description: 'Uses the primary menu when empty.',
      type: 'menu',
    },
    {
      name: 'showInEditor',
      title: 'Show dropdown in editor',
      description: 'Keeps the first dropdown open on the editor canvas so you can style it.',
      type: 'boolean',
      initialValue: false,
    },
  ],
  editableCSS: [
    {
      title: 'Menu',
      selector: styles.menu,
      properties: [
        'background',
        'flex-direction',
        'justify-content',
        'align-items',
        'gap',
        'padding',
        'border',
        'border-radius',
        'box-shadow',
      ],
    },
    {
      title: 'Item',
      selector: styles.link,
      properties: [...TEXT_PROPS, 'background', 'padding', 'border', 'border-radius'],
    },
    {
      title: 'Item hover',
      selector: `.${styles.link}:hover`,
      properties: [...TEXT_PROPS, 'background', 'border'],
    },
    {
      title: 'Current page',
      selector: `.${styles.link}.${styles.active}`,
      properties: [...TEXT_PROPS, 'background', 'border'],
    },
    {
      title: 'Dropdown',
      selector: styles.dropdown,
      properties: ['background', 'padding', 'border', 'border-radius', 'box-shadow', 'min-width'],
    },
    {
      title: 'Dropdown item',
      selector: styles.dropdownLink,
      properties: [...TEXT_PROPS, 'background', 'padding'],
    },
    {
      title: 'Dropdown item hover',
      selector: `.${styles.dropdownLink}:hover`,
      properties: [...TEXT_PROPS, 'background'],
    },
    {
      title: 'Dropdown arrow',
      selector: styles.toggle,
      properties: ['color', 'width', 'height'],
    },
  ],
});

export default StandardMenu;
