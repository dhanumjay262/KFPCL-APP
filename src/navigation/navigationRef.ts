import {
  CommonActions,
  createNavigationContainerRef,
} from "@react-navigation/native";

import type { RootStackParamList } from "./RootStack";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const resetToRoute = <T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T],
  options?: { withMainTabsBase?: boolean },
) => {
  if (!navigationRef.isReady()) return;

  const routes = options?.withMainTabsBase
    ? [{ name: "MainTabs" }, { name, params }]
    : [{ name, params }];

  navigationRef.dispatch(
    CommonActions.reset({
      index: options?.withMainTabsBase ? 1 : 0,
      routes: routes as never,
    }),
  );
};
