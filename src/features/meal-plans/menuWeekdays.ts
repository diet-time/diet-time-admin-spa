export type MenuWeekday =
  | 'SATURDAY'
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY';

export const MENU_WEEKDAYS: readonly MenuWeekday[] = [
  'SATURDAY',
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
];

export const MVP_MENU_WEEKDAYS = MENU_WEEKDAYS.filter((weekday) => weekday !== 'FRIDAY');

export const isMenuWeekday = (value: unknown): value is MenuWeekday =>
  typeof value === 'string' && MENU_WEEKDAYS.includes(value.toUpperCase() as MenuWeekday);

export const normalizeMenuWeekday = (menuWeekday: unknown): MenuWeekday => {
  if (isMenuWeekday(menuWeekday)) return menuWeekday.toUpperCase() as MenuWeekday;
  throw new Error('The template day does not contain a supported weekday.');
};

export const defaultWeekdayDisplayOrder = (weekday: MenuWeekday) => MENU_WEEKDAYS.indexOf(weekday) + 1;

export const sortMenuDays = <T extends { displayOrder: number; menuWeekday: MenuWeekday }>(days: readonly T[]) =>
  [...days].sort((left, right) => left.displayOrder - right.displayOrder
    || defaultWeekdayDisplayOrder(left.menuWeekday) - defaultWeekdayDisplayOrder(right.menuWeekday));

export const menuWeekdayFromDate = (date: Date): MenuWeekday => {
  const jsWeekdayMap: MenuWeekday[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return jsWeekdayMap[date.getDay()]!;
};

export const isWeekdayConfigured = (days: readonly { menuWeekday: MenuWeekday }[], weekday: MenuWeekday) =>
  days.some((day) => day.menuWeekday === weekday);
