const { asyncHandler } = require("../utils/asyncHandler");
const { setCompanyName } = require("../services/auth.service");

const setCompanyNameHandler = asyncHandler(async (req, res) => {
  const companyName = req.body.companyName || req.body.company_name;

  if (!companyName || !String(companyName).trim()) {
    return res.status(400).json({ error: "Company name is required" });
  }

  const trimmed = String(companyName).trim();

  if (trimmed.length > 40) {
    return res.status(400).json({
      error: "Company name must be at most 40 characters",
    });
  }

  const player = await setCompanyName(req.user.id, trimmed);

  res.json({ player });
});

module.exports = { setCompanyNameHandler };
