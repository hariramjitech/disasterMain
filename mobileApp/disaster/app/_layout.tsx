import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

import EmergencyScreen from "./screens/EmergencyScreen";
import P2PChatScreen from "./screens/P2PChatScreen";
import AboutScreen from "./screens/AboutScreen";
import OfflineMapScreen from "./screens/OfflineMapScreen";
import CapAlertsScreen from "./screens/CapAlertsScreen";

const Tab = createBottomTabNavigator();

export default function Layout() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Emergency") {
            return <FontAwesome5 name="phone-alt" size={size} color={color} />;
          } else if (route.name === "P2P Chat") {
            return <Ionicons name="chatbubbles" size={size} color={color} />;
          } else if (route.name === "Offline Map") {
            return <FontAwesome5 name="map-marked-alt" size={size} color={color} />;
          } else if (route.name === "CAP Alerts") {
            return <Ionicons name="alert-circle" size={size} color={color} />;
          } else if (route.name === "About") {
            return <Ionicons name="information-circle" size={size} color={color} />;
          }
        },
        headerShown: true, // shows title bar
      })}
    >
      <Tab.Screen name="Emergency" component={EmergencyScreen} />
      <Tab.Screen name="P2P Chat" component={P2PChatScreen} />
      <Tab.Screen name="Offline Map" component={OfflineMapScreen} />
      <Tab.Screen name="CAP Alerts" component={CapAlertsScreen} />
      <Tab.Screen name="About" component={AboutScreen} />
    </Tab.Navigator>
  );
}
