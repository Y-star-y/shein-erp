import type { ThemeConfig } from "antd";
import { theme } from "antd";

export const appTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    borderRadius: 8,
    colorPrimary: "#165dff",
    colorTextLightSolid: "#fff",
    fontFamily:
      'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  components: {
    Button: {
      primaryColor: "#fff",
      dangerColor: "#fff",
    },
  },
};
