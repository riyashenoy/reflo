import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import theme, { scale } from '../theme';

type Props = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Pencil tip points toward the left (Feather edit path). */
export function EditPencilIcon({
  size = scale(20),
  color = theme.colors.red,
  style,
}: Props) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
