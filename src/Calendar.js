import PropTypes from 'prop-types';
import React from 'react';
import uncontrollable from 'uncontrollable';
import cn from 'classnames';
import {
  accessor,
  elementType,
  dateFormat,
  dateRangeFormat,
  views as componentViews,
} from './utils/propTypes';

import { notify } from './utils/helpers';
import { navigate, views } from './utils/constants';
import defaultFormats from './formats';
import message from './utils/messages';
import moveDate from './utils/move';
import VIEWS from './Views';
import Toolbar from './Toolbar';
import EventWrapper from './EventWrapper';
import BackgroundWrapper from './BackgroundWrapper';
import DateContentRowWrapper from './DateContentRowWrapper';

import omit from 'lodash/omit';
import defaults from 'lodash/defaults';
import transform from 'lodash/transform';
import mapValues from 'lodash/mapValues';

import { ContextMenu, MenuItem, connectMenu } from 'react-contextmenu';
import { RIGHT_CLICK_EVENT, RIGHT_CLICK_DAY_CELL } from './ContextMenuTypes';

import addMonths from 'date-fns/add_months';
import getMonth from 'date-fns/get_month';
import getYear from 'date-fns/get_year';
import { subMonths } from 'date-fns';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function viewNames(_views) {
  return !Array.isArray(_views) ? Object.keys(_views) : _views;
}

function isValidView(view, { views: _views }) {
  let names = viewNames(_views);
  return names.indexOf(view) !== -1;
}

let now = new Date();

/**
 * react-big-calendar is full featured Calendar component for managing events and dates. It uses
 * modern `flexbox` for layout making it super responsive and performant. Leaving most of the layout heavy lifting
 * to the browser. __note:__ The default styles use `height: 100%` which means your container must set an explicit
 * height (feel free to adjust the styles to suit your specific needs).
 *
 * Big Calendar is unopiniated about editing and moving events, prefering to let you implement it in a way that makes
 * the most sense to your app. It also tries not to be prescriptive about your event data structures, just tell it
 * how to find the start and end datetimes and you can pass it whatever you want.
 *
 * One thing to note is that, `react-big-calendar` treats event start/end dates as an _exclusive_ range.
 * which means that the event spans up to, but not including, the end date. In the case
 * of displaying events on whole days, end dates are rounded _up_ to the next day. So an
 * event ending on `Apr 8th 12:00:00 am` will not appear on the 8th, whereas one ending
 * on `Apr 8th 12:01:00 am` will. If you want _inclusive_ ranges consider providing a
 * function `endAccessor` that returns the end date + 1 day for those events that end at midnight.
 */
class Calendar extends React.Component {
  state = {
    selected: {},
    switchMonthHeader: false,
    selectedList: [],
    startOfCurrentMonth: null,
    endOfCurrentMonth: null,
    activeCalendar: null,
  };

  constructor(props) {
    super(props);
    const date = new Date();
    this.state = {
      startOfCurrentMonth: new Date(date.getFullYear(), date.getMonth(), 1),
      endOfCurrentMonth: new Date(date.getFullYear(), date.getMonth() + 1, 0),
      activeCalendar: 1,
      selected: {},
      switchMonthHeader: false,
      selectedList: [],
    };
  }

  static propTypes = {
    /**
     * Props passed to main calendar `<div>`.
     */
    elementProps: PropTypes.object,

    /**
     * The current date value of the calendar. Determines the visible view range
     *
     * @controllable onNavigate
     */
    date: PropTypes.instanceOf(Date),

    /**
     * The current view of the calendar.
     *
     * @default 'month'
     * @controllable onView
     */
    view: PropTypes.string,

    /**
     * An array of event objects to display on the calendar
     */
    events: PropTypes.arrayOf(PropTypes.object),

    /**
     * Callback fired when the `date` value changes.
     *
     * @controllable date
     */
    onNavigate: PropTypes.func,

    /**
     * Callback fired when the `view` value changes.
     *
     * @controllable date
     */
    onView: PropTypes.func,

    /**
     * A callback fired when a date selection is made. Only fires when `selectable` is `true`.
     *
     * ```js
     * (
     *   slotInfo: {
     *     start: Date,
     *     end: Date,
     *     slots: Array<Date>,
     *     action: "select" | "click"
     *   }
     * ) => any
     * ```
     */
    onSelectSlot: PropTypes.func,

    /**
     * A callback fired when a date right click is made. Only fires when `selectable` is `true`.
     *
     * ```js
     * (
     *   slotInfo: {
     *     start: Date,
     *     end: Date,
     *     slots: Array<Date>,
     *     action: "select" | "click"
     *   }
     * ) => any
     * ```
     */
    onRightClickSlot: PropTypes.func,

    /**
     * Callback fired when a calendar event is selected.
     *
     * ```js
     * (event: Object, e: SyntheticEvent) => any
     * ```
     *
     * @controllable selected
     */
    onSelectEvent: PropTypes.func,

    /**
     * Callback fired when a calendar event is clicked twice.
     *
     * ```js
     * (event: Object, e: SyntheticEvent) => void
     * ```
     */
    onDoubleClickEvent: PropTypes.func,

    /**
     * Callback fired when dragging a selection in the Time views.
     *
     * Returning `false` from the handler will prevent a selection.
     *
     * ```js
     * (range: { start: Date, end: Date }) => ?boolean
     * ```
     */
    onSelecting: PropTypes.func,

    /**
     * Callback fired when a calendar event is selected while pressing shift key.
     *
     * ```js
     * (e: SyntheticEvent) => any
     * ```
     *
     * @controllable selected
     */
    onShiftSelect: PropTypes.func,

    /**
     * The selected event, if any.
     */
    selected: PropTypes.object,

    /**
     * An array of built-in view names to allow the calendar to display.
     * accepts either an array of builtin view names,
     *
     * ```jsx
     * views={['month', 'day', 'agenda']}
     * ```
     * or an object hash of the view name and the component (or boolean for builtin).
     *
     * ```jsx
     * views={{
     *   month: true,
     *   week: false,
     *   myweek: WorkWeekViewComponent,
     * }}
     * ```
     *
     * Custom views can be any React component, that implements the following
     * interface:
     *
     * ```js
     * interface View {
     *   static title(date: Date, { formats: DateFormat[], culture: string?, ...props }): string
     *   static navigate(date: Date, action: 'PREV' | 'NEXT' | 'DATE'): Date
     * }
     * ```
     *
     * @type Calendar.Views ('month'|'week'|'work_week'|'day'|'agenda')
     * @default ['month', 'week', 'day', 'agenda']
     */
    views: componentViews,

    /**
     * The string name of the destination view for drill-down actions, such
     * as clicking a date header, or the truncated events links. If
     * `getDrilldownView` is also specified it will be used instead.
     *
     * Set to `null` to disable drill-down actions.
     *
     * ```js
     * <BigCalendar
     *   drilldownView="agenda"
     * />
     * ```
     */
    drilldownView: PropTypes.string,

    /**
     * Functionally equivalent to `drilldownView`, but accepts a function
     * that can return a view name. It's useful for customizing the drill-down
     * actions depending on the target date and triggering view.
     *
     * Return `null` to disable drill-down actions.
     *
     * ```js
     * <BigCalendar
     *   getDrilldownView={(targetDate, currentViewName, configuredViewNames) =>
     *     if (currentViewName === 'month' && configuredViewNames.includes('week'))
     *       return 'week'
     *
     *     return null;
     *   }}
     * />
     * ```
     */
    getDrilldownView: PropTypes.func,

    /**
     * Determines whether the toolbar is displayed
     */
    toolbar: PropTypes.bool,

    /**
     * React component to be rendered at the right of the toolbar
     */
    toolbarExtras: PropTypes.element,

    /**
     * Show truncated events in an overlay when you click the "+_x_ more" link.
     */
    popup: PropTypes.bool,

    /**
     * Distance in pixels, from the edges of the viewport, the "show more" overlay should be positioned.
     *
     * ```jsx
     * <BigCalendar popupOffset={30}/>
     * <BigCalendar popupOffset={{x: 30, y: 20}}/>
     * ```
     */
    popupOffset: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
    ]),

    /**
     * Allows mouse selection of ranges of dates/times.
     *
     * The 'ignoreEvents' option prevents selection code from running when a
     * drag begins over an event. Useful when you want custom event click or drag
     * logic
     */
    selectable: PropTypes.oneOf([true, false, 'ignoreEvents']),

    /**
     * Specifies the number of miliseconds the user must press and hold on the screen for a touch
     * to be considered a "long press." Long presses are used for time slot selection on touch
     * devices.
     *
     * @type {number}
     * @default 250
     */
    longPressThreshold: PropTypes.number,

    /**
     * Determines the selectable time increments in week and day views
     */
    step: PropTypes.number,

    /**
     * The number of slots per "section" in the time grid views. Adjust with `step`
     * to change the default of 1 hour long groups, with 30 minute slots.
     */
    timeslots: PropTypes.number,

    /**
     *Switch the calendar to a `right-to-left` read direction.
     */
    rtl: PropTypes.bool,

    /**
     * Optionally provide a function that returns an object of className or style props
     * to be applied to the the event node.
     *
     * ```js
     * (
     * 	event: Object,
     * 	start: Date,
     * 	end: Date,
     * 	isSelected: boolean
     * ) => { className?: string, style?: Object }
     * ```
     */
    eventPropGetter: PropTypes.func,

    /**
     * Optionally provide a function that returns an object of className or style props
     * to be applied to the the time-slot node. Caution! Styles that change layout or
     * position may break the calendar in unexpected ways.
     *
     * ```js
     * (date: Date) => { className?: string, style?: Object }
     * ```
     */
    slotPropGetter: PropTypes.func,

    /**
     * Accessor for the event title, used to display event information. Should
     * resolve to a `renderable` value.
     *
     * ```js
     * string | (event: Object) => any
     * ```
     *
     * @type {(func|string)}
     */
    titleAccessor: accessor,

    /**
     * Determines whether the event should be considered an "all day" event and ignore time.
     * Must resolve to a `boolean` value.
     *
     * ```js
     * string | (event: Object) => boolean
     * ```
     *
     * @type {(func|string)}
     */
    allDayAccessor: accessor,

    /**
     * The start date/time of the event. Must resolve to a JavaScript `Date` object.
     *
     * ```js
     * string | (event: Object) => Date
     * ```
     *
     * @type {(func|string)}
     */
    startAccessor: accessor,

    /**
     * The end date/time of the event. Must resolve to a JavaScript `Date` object.
     *
     * ```js
     * string | (event: Object) => Date
     * ```
     *
     * @type {(func|string)}
     */
    endAccessor: accessor,

    /**
     * Support to show multi-day events with specific start and end times in the
     * main time grid (rather than in the all day header).
     *
     * **Note: This may cause calendars with several events to look very busy in
     * the week and day views.**
     */
    showMultiDayTimes: PropTypes.bool,

    /**
     * Constrains the minimum _time_ of the Day and Week views.
     */
    min: PropTypes.instanceOf(Date),

    /**
     * Constrains the maximum _time_ of the Day and Week views.
     */
    max: PropTypes.instanceOf(Date),

    /**
     * Determines how far down the scroll pane is initially scrolled down.
     */
    scrollToTime: PropTypes.instanceOf(Date),

    /**
     * Specify a specific culture code for the Calendar.
     *
     * **Note: it's generally better to handle this globally via your i18n library.**
     */
    culture: PropTypes.string,

    /**
     * Localizer specific formats, tell the Calendar how to format and display dates.
     *
     * `format` types are dependent on the configured localizer; both Moment and Globalize
     * accept strings of tokens according to their own specification, such as: `'DD mm yyyy'`.
     *
     * ```jsx
     * let formats = {
     *   dateFormat: 'dd',
     *
     *   dayFormat: (date, culture, localizer) =>
     *     localizer.format(date, 'DDD', culture),
     *
     *   dayRangeHeaderFormat: ({ start, end }, culture, local) =>
     *     local.format(start, { date: 'short' }, culture) + ' — ' +
     *     local.format(end, { date: 'short' }, culture)
     * }
     *
     * <Calendar formats={formats} />
     * ```
     *
     * All localizers accept a function of
     * the form `(date: Date, culture: ?string, localizer: Localizer) -> string`
     */
    formats: PropTypes.shape({
      /**
       * Format for the day of the month heading in the Month view.
       * e.g. "01", "02", "03", etc
       */
      dateFormat,

      /**
       * A day of the week format for Week and Day headings,
       * e.g. "Wed 01/04"
       *
       */
      dayFormat: dateFormat,

      /**
       * Week day name format for the Month week day headings,
       * e.g: "Sun", "Mon", "Tue", etc
       *
       */
      weekdayFormat: dateFormat,

      /**
       * The timestamp cell formats in Week and Time views, e.g. "4:00 AM"
       */
      timeGutterFormat: dateFormat,

      /**
       * Toolbar header format for the Month view, e.g "2015 April"
       *
       */
      monthHeaderFormat: dateFormat,

      /**
       * Toolbar header format for the Week views, e.g. "Mar 29 - Apr 04"
       */
      dayRangeHeaderFormat: dateRangeFormat,

      /**
       * Toolbar header format for the Day view, e.g. "Wednesday Apr 01"
       */
      dayHeaderFormat: dateFormat,

      /**
       * Toolbar header format for the Agenda view, e.g. "4/1/2015 — 5/1/2015"
       */
      agendaHeaderFormat: dateFormat,

      /**
       * A time range format for selecting time slots, e.g "8:00am — 2:00pm"
       */
      selectRangeFormat: dateRangeFormat,

      agendaDateFormat: dateFormat,
      agendaTimeFormat: dateFormat,
      agendaTimeRangeFormat: dateRangeFormat,

      /**
       * Time range displayed on events.
       */
      eventTimeRangeFormat: dateRangeFormat,

      /**
       * An optional event time range for events that continue onto another day
       */
      eventTimeRangeStartFormat: dateFormat,

      /**
       * An optional event time range for events that continue from another day
       */
      eventTimeRangeEndFormat: dateFormat,
    }),

    /**
     * Customize how different sections of the calendar render by providing custom Components.
     * In particular the `Event` component can be specified for the entire calendar, or you can
     * provide an individual component for each view type.
     *
     * ```jsx
     * let components = {
     *   event: MyEvent, // used by each view (Month, Day, Week)
     *   toolbar: MyToolbar,
     *   agenda: {
     *   	 event: MyAgendaEvent // with the agenda view use a different component to render events
     *   }
     * }
     * <Calendar components={components} />
     * ```
     */
    components: PropTypes.shape({
      event: elementType,
      eventWrapper: elementType,
      dayWrapper: elementType,
      dateCellWrapper: elementType,

      toolbar: elementType,

      agenda: PropTypes.shape({
        date: elementType,
        time: elementType,
        event: elementType,
      }),

      day: PropTypes.shape({
        header: elementType,
        event: elementType,
      }),
      week: PropTypes.shape({
        header: elementType,
        event: elementType,
      }),
      month: PropTypes.shape({
        header: elementType,
        dateHeader: elementType,
        event: elementType,
      }),
    }),

    /**
     * String messages used throughout the component, override to provide localizations
     */
    messages: PropTypes.shape({
      allDay: PropTypes.node,
      previous: PropTypes.node,
      next: PropTypes.node,
      today: PropTypes.node,
      month: PropTypes.node,
      week: PropTypes.node,
      day: PropTypes.node,
      agenda: PropTypes.node,
      date: PropTypes.node,
      time: PropTypes.node,
      event: PropTypes.node,
      showMore: PropTypes.func,
    }),

    /**
     * A func that should return an array containing context menu objects.
     * Object should contain: label [string], onClick [func], data [obj] props
     */
    contextMenuItems: PropTypes.func,

    eventsSorter: PropTypes.func,
  };

  static defaultProps = {
    elementProps: {},
    popup: false,
    toolbar: true,
    view: views.MONTH,
    views: [views.MONTH, views.WEEK, views.DAY, views.AGENDA],
    date: now,
    step: 30,

    drilldownView: views.DAY,

    titleAccessor: 'title',
    allDayAccessor: 'allDay',
    startAccessor: 'start',
    endAccessor: 'end',

    longPressThreshold: 250,
  };

  componentDidMount() {
    window.addEventListener('scroll', this.handleScroll);
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
  }

  handleScroll = () => {
    const { switchMonthHeader } = this.state;
    const secondMonthFromTop = document.getElementById('month-view-two').getBoundingClientRect()
      .top;

    if (secondMonthFromTop === 0) {
      this.setState({ switchMonthHeader: false });
    } else if (secondMonthFromTop < 130 && !switchMonthHeader) {
      this.setState({ switchMonthHeader: true });
    } else if (secondMonthFromTop > 130 && switchMonthHeader) {
      this.setState({ switchMonthHeader: false });
    }
  };

  getViews = () => {
    const views = this.props.views;

    if (Array.isArray(views)) {
      return transform(views, (obj, name) => (obj[name] = VIEWS[name]), {});
    }

    if (typeof views === 'object') {
      return mapValues(views, (value, key) => {
        if (value === true) {
          return VIEWS[key];
        }

        return value;
      });
    }

    return VIEWS;
  };

  getView = () => {
    const views = this.getViews();

    return views[this.props.view];
  };

  getDrilldownView = date => {
    const { view, drilldownView, getDrilldownView } = this.props;

    if (!getDrilldownView) return drilldownView;

    return getDrilldownView(date, view, Object.keys(this.getViews()));
  };

  renderContextMenu = () => {
    const { contextMenuItems } = this.props;

    if (!contextMenuItems) return null;

    const ctxMenuItems = contextMenuItems();

    return (
      <ContextMenu id="contextMenu">
        {ctxMenuItems.map((m, i) => (
          <MenuItem key={i} onClick={m.onClick} data={m.data}>
            {m.label}
          </MenuItem>
        ))}
      </ContextMenu>
    );
  };

  renderEventMenu() {
    const { contextMenuComponents: { event: ContextMenu } } = this.props;

    if (!ContextMenu) return null;

    const ConnectedMenu = connectMenu(RIGHT_CLICK_EVENT)(ContextMenu);

    return <ConnectedMenu />;
  }

  renderDayCellMenu() {
    const { contextMenuComponents: { dayCell: ContextMenu } } = this.props;

    if (!ContextMenu) return null;

    const ConnectedMenu = connectMenu(RIGHT_CLICK_DAY_CELL)(ContextMenu);

    return <ConnectedMenu />;
  }

  handleCalendarMonthChange = (date: Date, action) => {
    const dateTime = new Date(date).getTime();
    let { startOfCurrentMonth, endOfCurrentMonth, activeCalendar } = this.state;
    const startOfCurrentMonthTime = startOfCurrentMonth.getTime();
    const endOfCurrentMonthTime = endOfCurrentMonth.getTime();

    if (action === navigate.NEXT) {
      const nextMonth = startOfCurrentMonth.getMonth() + 1;

      startOfCurrentMonth = new Date(startOfCurrentMonth.getFullYear(), nextMonth, 1);

      endOfCurrentMonth = new Date(endOfCurrentMonth.getFullYear(), nextMonth + 1, 0);
    }

    if (action === navigate.PREVIOUS) {
      const previousMonth = startOfCurrentMonth.getMonth() - 1;

      startOfCurrentMonth = new Date(startOfCurrentMonth.getFullYear(), previousMonth, 1);

      endOfCurrentMonth = new Date(endOfCurrentMonth.getFullYear(), previousMonth + 1, 0);
    }

    if (dateTime < startOfCurrentMonthTime && action === null) {
      activeCalendar = 1;
      startOfCurrentMonth = new Date(
        startOfCurrentMonth.getFullYear(),
        startOfCurrentMonth.getMonth() - 1,
        1,
      );
      endOfCurrentMonth = new Date(
        endOfCurrentMonth.getFullYear(),
        endOfCurrentMonth.getMonth(),
        0,
      );
    }

    if (dateTime > endOfCurrentMonthTime && action === null) {
      activeCalendar = 2;

      const dateCurrentMonth = date.getMonth();
      const startMonth = startOfCurrentMonth.getMonth();

      const nextMonth = dateCurrentMonth > startMonth ? dateCurrentMonth : startMonth + 1;

      startOfCurrentMonth = new Date(startOfCurrentMonth.getFullYear(), nextMonth, 1);
      endOfCurrentMonth = new Date(endOfCurrentMonth.getFullYear(), nextMonth + 1, 0);
    }

    this.setState({
      activeCalendar,
      startOfCurrentMonth,
      endOfCurrentMonth,
    });
  };

  render() {
    let {
      view,
      toolbar,
      events,
      culture,
      components = {},
      formats = {},
      messages = {},
      style,
      className,
      elementProps,
      toolbarExtras,
      date: current,
      showTwoMonths,
      ...props
    } = this.props;
    const { startOfCurrentMonth, endOfCurrentMonth, activeCalendar } = this.state;

    formats = defaultFormats(formats);
    messages = message(messages);

    let View = this.getView();
    let names = viewNames(this.props.views);

    let viewComponents = defaults(components[view] || {}, omit(components, names), {
      eventWrapper: EventWrapper,
      dayWrapper: BackgroundWrapper,
      dateCellWrapper: BackgroundWrapper,
      dateContentRowWrapper: DateContentRowWrapper,
    });

    let nextMonth = addMonths(current, 1);
    let labelNextMonth = '';

    if (showTwoMonths) {
      nextMonth = activeCalendar === 2 ? current : nextMonth;
      labelNextMonth = View.title(nextMonth, { formats, culture });
      current = subMonths(nextMonth, 1);
    }

    let CalToolbar = components.toolbar || Toolbar;
    const label = View.title(current, { formats, culture });

    return (
      <div
        {...elementProps}
        className={cn('rbc-calendar', className, {
          'rbc-rtl': props.rtl,
        })}
        style={style}
      >
        {toolbar && (
          <CalToolbar
            date={current}
            view={view}
            views={names}
            label={this.state.switchMonthHeader ? labelNextMonth : label}
            onViewChange={this.handleViewChange}
            onNavigate={this.handleNavigate}
            messages={messages}
            toolbarExtras={toolbarExtras}
          />
        )}
        <View
          {...formats}
          {...props}
          components={viewComponents}
          culture={culture}
          date={current}
          events={events}
          formats={undefined}
          getDrilldownView={this.getDrilldownView}
          messages={messages}
          onDoubleClickEvent={this.handleDoubleClickEvent}
          onDrillDown={this.handleDrillDown}
          onInlineEditEventTitle={this.props.onInlineEditEventTitle}
          onNavigate={this.handleNavigate}
          onRightClickSlot={this.handleRightClickSlot}
          onSelectEvent={this.handleSelectEvent}
          onSelectSlot={this.handleSelectSlot}
          onShowMore={this._showMore}
          ref="view"
          selected={this.state.selected}
          selectedList={this.state.selectedList}
          showAllEvents={this.props.showAllEvents}
          activeCalendar={activeCalendar}
          calendarId={1}
        />
        <div
          id="month-view-two"
          className="rbc-month-view-two"
          style={{ display: showTwoMonths ? 'block' : 'none' }}
        >
          <div
            className="rbc-month-header-two"
            style={{
              borderColor: '#ddd',
              borderStyle: 'solid none solid none',
              borderWidth: '1px',
              color: '#454545',
              display: 'flex',
              fontSize: '22px',
              fontWeight: '500',
              padding: '10px 27px',
              textAlign: 'center',
            }}
          >
            <span style={{ minWidth: 206 }} />
            <span style={{ flex: 2 }}>
              {MONTHS[getMonth(nextMonth)]} {getYear(nextMonth)}
            </span>
            <span style={{ minWidth: 362 }} />
          </div>
          <View
            {...formats}
            {...props}
            components={viewComponents}
            culture={culture}
            date={nextMonth}
            events={events}
            formats={undefined}
            getDrilldownView={this.getDrilldownView}
            messages={messages}
            onDoubleClickEvent={this.handleDoubleClickEvent}
            onDrillDown={this.handleDrillDown}
            onInlineEditEventTitle={this.props.onInlineEditEventTitle}
            onNavigate={this.handleNavigate}
            onRightClickSlot={this.handleRightClickSlot}
            onSelectEvent={this.handleSelectEvent}
            onSelectSlot={this.handleSelectSlot}
            onShowMore={this._showMore}
            ref="view"
            selected={this.state.selected}
            selectedList={this.state.selectedList}
            showAllEvents={this.props.showAllEvents}
            activeCalendar={activeCalendar}
            calendarId={2}
          />
        </div>

        {this.renderDayCellMenu()}
        {this.renderEventMenu()}
      </div>
    );
  }

  handleNavigate = (action, newDate) => {
    let { view, date, onNavigate, showTwoMonths, ...props } = this.props;
    let ViewComponent = this.getView();

    date = moveDate(ViewComponent, {
      ...props,
      action,
      date: newDate || date,
    });

    if (showTwoMonths) {
      this.handleCalendarMonthChange(date, action);
    }

    onNavigate(date, view, action);
  };

  handleViewChange = view => {
    if (view !== this.props.view && isValidView(view, this.props)) this.props.onView(view);
  };

  handleSelectEvent = (eventInfo, ...args) => {
    const [event] = args;
    const { selectedList } = this.state;
    event.persist();

    if (event && event.shiftKey) {
      const copySelectedList = selectedList;
      let eventIndex = null,
        hasEvent = false;

      for (let index = 0; index < selectedList.length; index++) {
        const evt = selectedList[index];

        if (evt.id === eventInfo.id) {
          eventIndex = index;
          hasEvent = true;
          break;
        }
      }

      if (hasEvent) {
        copySelectedList.splice(eventIndex, eventIndex + 1);
      } else {
        copySelectedList.push(eventInfo);
      }
      this.setState({ selectedList: copySelectedList }, () => {
        notify(this.props.onShiftSelect, copySelectedList);
      });
    } else {
      selectedList.length = 0;
      selectedList.push(eventInfo);
      this.setState({ selectedList }, () => {
        notify(this.props.onShiftSelect, selectedList);
      });
    }

    this.setState({ selected: eventInfo }, () => {
      notify(this.props.onSelectEvent, eventInfo);
    });
  };

  handleDoubleClickEvent = (...args) => {
    notify(this.props.onDoubleClickEvent, args);
  };

  handleSelectSlot = slotInfo => {
    this.setState({ selected: {} }, () => {
      notify(this.props.onSelectSlot, slotInfo);
    });
  };

  handleRightClickSlot = slotInfo => {
    notify(this.props.onRightClickSlot, slotInfo);
  };

  handleDrillDown = (date, view) => {
    if (view) this.handleViewChange(view);

    this.handleNavigate(navigate.DATE, date);
  };
}

export default uncontrollable(Calendar, {
  view: 'onView',
  date: 'onNavigate',
});
