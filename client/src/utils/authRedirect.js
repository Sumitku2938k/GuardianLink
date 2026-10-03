export const getRoleDashboardRoute = (role, status) => {
  const normalizedStatus = (status || "").toLowerCase().trim();
  const normalizedRole = (role || "").toLowerCase().trim();

  // For Police and NGO accounts awaiting admin approval or rejected
  if (normalizedRole === "police" || normalizedRole === "ngo") {
    if (normalizedStatus === "pending" || normalizedStatus === "rejected") {
      return "/verification-pending";
    }
  }

  // Any general pending or rejected status
  if (normalizedStatus === "pending" || normalizedStatus === "rejected") {
    return "/verification-pending";
  }

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
