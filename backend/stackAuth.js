const STACK_API_URL = process.env.STACK_API_URL || 'https://api.stack-auth.com'
const STACK_PROJECT_ID = process.env.STACK_PROJECT_ID
const STACK_SECRET_SERVER_KEY = process.env.STACK_SECRET_SERVER_KEY

function isStackServerConfigured() {
  return Boolean(STACK_PROJECT_ID && STACK_SECRET_SERVER_KEY)
}

async function fetchCurrentUser(accessToken) {
  const response = await fetch(`${STACK_API_URL}/api/v1/users/me`, {
    headers: {
      'x-stack-access-type': 'server',
      'x-stack-project-id': STACK_PROJECT_ID,
      'x-stack-secret-server-key': STACK_SECRET_SERVER_KEY,
      'x-stack-access-token': accessToken,
    },
  })

  if (response.status === 200) {
    return response.json()
  }

  return null
}

async function requireAuth(req, res, next) {
  if (!isStackServerConfigured()) {
    return res.status(500).json({ error: 'Stack Auth server credentials are not configured' })
  }

  const accessToken = req.get('x-stack-access-token')
  if (!accessToken) {
    return res.status(401).json({ error: 'Missing auth token' })
  }

  try {
    const user = await fetchCurrentUser(accessToken)
    if (!user) {
      return res.status(401).json({ error: 'Invalid auth token' })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify auth token: ' + error.message })
  }
}

module.exports = {
  fetchCurrentUser,
  isStackServerConfigured,
  requireAuth,
}
