import React from "react";
import { Redirect } from "expo-router";

export default function ParentDashboard() {
  // This screen now redirects to the tab navigator
  return <Redirect href="/(parent)/home" />;
}
