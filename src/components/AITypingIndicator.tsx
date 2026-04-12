import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export interface AITypingIndicatorProps {
  color?: string;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

export function AITypingIndicator({ color = '#38bdf8', style }: AITypingIndicatorProps) {
  const dotOne = useRef(new Animated.Value(0)).current;
  const dotTwo = useRef(new Animated.Value(0)).current;
  const dotThree = useRef(new Animated.Value(0)).current;
  const animValues = useMemo(() => [dotOne, dotTwo, dotThree], [dotOne, dotTwo, dotThree]);

  useEffect(() => {
    const animations = animValues.map((value: Animated.Value, index: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(value, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 420, useNativeDriver: true })
        ])
      )
    );

    animations.forEach((animation: Animated.CompositeAnimation) => animation.start());

    return () => {
      animations.forEach((animation: Animated.CompositeAnimation) => animation.stop());
    };
  }, [animValues]);

  return (
    <View style={[styles.container, style]}>
      {animValues.map((value: Animated.Value, index: number) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: color,
              opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [
                {
                  translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -4] })
                }
              ]
            }
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 6,
    alignItems: 'center'
  },
  dot: {
    borderRadius: 999,
    height: 8,
    width: 8
  }
});
