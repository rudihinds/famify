import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "../../store";

export default function ChildIndex() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.child);

  useEffect(() => {
    // Redirect based on authentication status
    if (isAuthenticated) {
      router.replace("/(child)/home");
    } else {
      router.replace("/child/scanner");
    }
  }, [isAuthenticated]);

  // Return null while redirecting
  return null;
}