import { View, Text } from "react-native";

interface Props {
  data: { label: string; value: number }[];
  unitSuffix?: string;
  emptyText?: string;
}

export function MiniBarChart({ data, unitSuffix = "", emptyText = "No data" }: Props) {
  if (!data.length) {
    return (
      <View className="py-6 items-center">
        <Text className="text-sm text-slate-400">{emptyText}</Text>
      </View>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const last = data[data.length - 1];

  return (
    <View>
      <View className="flex-row items-end h-28 gap-1.5">
        {data.map((d, i) => {
          const heightPct = Math.max(4, (d.value / max) * 100);
          return (
            <View key={i} className="flex-1 items-center justify-end">
              <Text className="text-[9px] text-slate-400 mb-1" numberOfLines={1}>
                {d.value > 0 ? d.value.toFixed(1) : ""}
              </Text>
              <View
                className="w-full bg-strava rounded-t-md"
                style={{ height: `${heightPct}%`, opacity: i === data.length - 1 ? 1 : 0.55 }}
              />
            </View>
          );
        })}
      </View>
      <View className="flex-row gap-1.5 mt-1.5">
        {data.map((d, i) => (
          <Text
            key={i}
            className="flex-1 text-[9px] text-slate-400 text-center"
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
      <Text className="text-xs text-slate-500 mt-2 text-center">
        Latest: {last.value.toFixed(1)}
        {unitSuffix}
      </Text>
    </View>
  );
}
