export const getRoleDashboardRoute = (role, status) => {
  if (status === "pending") {
    return "/verification-pending";
  }

  const normalizedRole = (role || "").toLowerCase();

  switch (normalizedRole) {
    case "parent":
      return "/dashboard"; // Parent portal root dashboard
    case "citizen":
      return "/citizen/dashboard";
    case "police":
      return "/police/dashboard";
    case "ngo":
      return "/ngo/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/dashboard";
  }
};
