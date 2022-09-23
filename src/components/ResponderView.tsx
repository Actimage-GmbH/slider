import React from 'react'
import * as RN from 'react-native'
import useRounding from '../hooks/useRounding'

type Props = RN.ViewProps & {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  style?: RN.StyleProp<RN.ViewStyle>;
  inverted: boolean;
  vertical: boolean;
  enabled: boolean;
  thumbSize?: number;
  updateValue: (value: number) => void;
  onMove: (value: number) => void;
  onPress: (value: number) => void;
  onRelease: (value: number) => void;
  children?: React.ReactNode;
}

const accessibility = [
  { name: 'increment', label: 'increment' },
  { name: 'decrement', label: 'decrement' }
]

const styleSheet = RN.StyleSheet.create({
  view: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    alignItems: 'center'
  },
  row: {
    flexDirection: 'row'
  },
  rowReverse: {
    flexDirection: 'row-reverse'
  },
  column: {
    flexDirection: 'column'
  },
  columnReverse: {
    flexDirection: 'column-reverse'
  }
})

const ResponderView = React.forwardRef<RN.View, Props>(({
  vertical, inverted, enabled,
  style,
  minimumValue, maximumValue, value, step,
  updateValue,
  onLayout: onLayoutProp,
  onMove: onMoveProp,
  onPress: onPressProp,
  onRelease: onReleaseProp,
  ...props
}: Props, ref) => {
  const containerSize = React.useRef({ width: 0, height: 0 })
  const fallbackRef = React.useRef<RN.View>(null)
  const forwardRef = (ref || fallbackRef) as RefObject<View>
  const round = useRounding({ step, minimumValue, maximumValue })

  // We calculate the style of the container
  const isVertical = React.useMemo(() => vertical || (style && (RN.StyleSheet.flatten(style).flexDirection || '').startsWith('column')), [vertical, style])
  const containerStyle = React.useMemo(() => ([
    styleSheet.view,
    // This is for web
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    RN.Platform.OS === "web" && { userSelect: 'none', cursor: 'pointer' },
    styleSheet[(isVertical ? 'column' : 'row') + (inverted ? 'Reverse' : '') as 'row'],
    style
  ]), [style, isVertical, inverted])

  const responderViewInformationRef = React.useRef<{width: number, height: number, pageX: number, pageY: number}|undefined>(undefined)

  const initResponderViewInformationRef = () => {
    forwardRef?.current?.measure((_ox : number, _oy : number, width: number, height: number, px: number, py: number) => {
      responderViewInformationRef.current={
        pageX: px,
        pageY: py,
        width: width,
        height: height
      }
    })
  }

  // Accessibility actions
  const accessibilityActions = React.useCallback((event: RN.AccessibilityActionEvent) => {
    const tenth = (maximumValue - minimumValue) / 10
    switch (event.nativeEvent.actionName) {
      case 'increment':
        updateValue(value + (step || tenth))
        break
      case 'decrement':
        updateValue(value - (step || tenth))
        break
    }
  }, [maximumValue, minimumValue, updateValue, value, step])
  const handleAccessibilityKeys = React.useCallback((event: RN.NativeSyntheticEvent<KeyboardEvent>) => {
    const key = event.nativeEvent.key
    switch (key) {
      case 'ArrowUp':
      case 'ArrowRight': {
        const accessibilityEvent = { ...event, nativeEvent: { actionName: 'increment' } }
        accessibilityActions(accessibilityEvent)
      } break
      case 'ArrowDown':
      case 'ArrowLeft': {
        const accessibilityEvent = { ...event, nativeEvent: { actionName: 'decrement' } }
        accessibilityActions(accessibilityEvent)
      } break
    }
  }, [accessibilityActions])
  const accessibilityValues = React.useMemo(() => ({ min: minimumValue, max: maximumValue, now: value }), [minimumValue, maximumValue, value])

  /** Convert a touch event into it's position on the slider */
  const eventToValue = React.useCallback((event: RN.GestureResponderEvent) => {
    const { locationX: x, locationY: y, pageX: eventPageX, pageY: eventPageY } = event.nativeEvent

    const offset = isVertical ? y : x

    if(isVertical) {
      if(typeof responderViewInformationRef.current?.pageY !== "undefined" && eventPageY < responderViewInformationRef.current?.pageY) return minimumValue

      if(typeof responderViewInformationRef.current?.pageY !== "undefined" && typeof responderViewInformationRef.current?.height !== "undefined" && eventPageY > (responderViewInformationRef.current?.pageY + responderViewInformationRef.current?.height&&0)) return maximumValue
    } else {
      if(typeof responderViewInformationRef.current?.pageX !== "undefined" && eventPageX < responderViewInformationRef.current?.pageX) return minimumValue

      if(typeof responderViewInformationRef.current?.pageX !== "undefined" && typeof responderViewInformationRef.current?.width !== "undefined" && eventPageX > (responderViewInformationRef.current?.pageX+ responderViewInformationRef.current?.width??0)) return maximumValue
    }
    const size = containerSize.current?.[isVertical ? 'height' : 'width'] || 1
    const newValue = inverted
      ? maximumValue - ((maximumValue - minimumValue) * offset) / size
      : minimumValue + ((maximumValue - minimumValue) * offset) / size
    return round(newValue)
  }, [isVertical, inverted, maximumValue, minimumValue, round])

  const shouldTriggerEvent = (event: RN.GestureResponderEvent) => {

    const { pageY: eventPageY, pageX: eventPageX } = event.nativeEvent

    if(!responderViewInformationRef.current) return false

    if(isVertical && (eventPageX < responderViewInformationRef.current.pageX || eventPageX > (responderViewInformationRef.current.pageX  + responderViewInformationRef.current.width))) return false

    if(!isVertical && (eventPageY < responderViewInformationRef.current.pageY || eventPageY > (responderViewInformationRef.current.pageY  + responderViewInformationRef.current.height))) return false

    return true
  }

  const onMove = React.useCallback((event: RN.GestureResponderEvent) => {
    if(shouldTriggerEvent(event)) {
      onMoveProp(eventToValue(event))
    }
    event.preventDefault()
  }, [eventToValue, onMoveProp])

  const onPress = React.useCallback((event: RN.GestureResponderEvent) => {
    initResponderViewInformationRef()

    if(shouldTriggerEvent(event)) {
      onPressProp(eventToValue(event))
    }

    event.preventDefault()
  }, [eventToValue, onPressProp])

  const onRelease = React.useCallback((event: RN.GestureResponderEvent) => {
    if(shouldTriggerEvent(event)) {
      onReleaseProp(eventToValue(event))
    }
    event.preventDefault()
  }, [eventToValue, onReleaseProp])

  const isEnabled = React.useCallback(() => enabled, [enabled])
  const onLayout = React.useCallback((event: RN.LayoutChangeEvent) => {
    onLayoutProp?.(event)
    containerSize.current = event.nativeEvent.layout
    initResponderViewInformationRef()
  }, [onLayoutProp])

  return <RN.View
    {...props}
    ref={forwardRef}
    onLayout={onLayout}
    accessibilityActions={accessibility}
    onAccessibilityAction={accessibilityActions}
    accessible={true}
    accessibilityValue={accessibilityValues}
    accessibilityRole={'adjustable'}
    style={containerStyle as RN.ViewStyle}
    onStartShouldSetResponder={isEnabled}
    onMoveShouldSetResponder={isEnabled}
    onResponderGrant={onPress}
    onResponderRelease={onRelease}
    onResponderMove={onMove}
    // This is for web
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    onKeyDown={handleAccessibilityKeys}
  />
})

ResponderView.displayName = 'ResponderView'

export default React.memo(ResponderView)
