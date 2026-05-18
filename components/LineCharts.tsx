import { View, Text } from "react-native";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { useTheme } from "@/context/ThemeContext";

export default function LineChart({
  data,
  width,
  height,
  color = "#0D7377",
  showArea = true,
}: {
  data: { label: string; value: number }[];
  width: number;
  height: number;
  color?: string;
  showArea?: boolean;
}) {
  const { colors } = useTheme();
  const padding = { top: 20, right: 10, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (data.length < 2) return null;

  const maxVal = Math.max(...data.map((d) => d.value)) * 1.1;
  const minVal = Math.min(...data.map((d) => d.value)) * 0.9;

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
  const getY = (v: number) =>
    padding.top + chartHeight - ((v - minVal) / (maxVal - minVal)) * chartHeight;

  // Build smooth path
  let pathD = "";
  let areaD = "";

  for (let i = 0; i < data.length; i++) {
    const x = getX(i);
    const y = getY(data[i].value);

    if (i === 0) {
      pathD += `M ${x} ${y}`;
      areaD += `M ${x} ${padding.top + chartHeight} L ${x} ${y}`;
    } else {
      const prevX = getX(i - 1);
      const prevY = getY(data[i - 1].value);
      const cpx1 = prevX + (x - prevX) / 2;
      const cpx2 = prevX + (x - prevX) / 2;
      pathD += ` C ${cpx1} ${prevY}, ${cpx2} ${y}, ${x} ${y}`;
      areaD += ` C ${cpx1} ${prevY}, ${cpx2} ${y}, ${x} ${y}`;
    }
  }

  areaD += ` L ${getX(data.length - 1)} ${padding.top + chartHeight} Z`;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.25} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {showArea && <Path d={areaD} fill="url(#areaGradient)" />}
        <Path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((d, i) => {
          const x = getX(i);
          const y = getY(d.value);
          return (
            <Circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill={colors.card}
              stroke={color}
              strokeWidth={2}
            />
          );
        })}
      </Svg>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: padding.left,
          marginTop: -8,
        }}
      >
        {data.map((d, i) => (
          <Text
            key={i}
            style={{
              fontSize: 10,
              color: colors.textMuted,
              textAlign: "center",
              width: 30,
            }}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
