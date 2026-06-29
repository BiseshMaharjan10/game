# API Response Blueprints

This file documents the current response contract for each backend endpoint.
It is based on the live controllers and `src/utils/responseMappers.js`.

## Base Notes

- Protected routes require `Authorization: Bearer <access_token>`.
- Success responses may include extra mapped fields, but the structures below are the stable top-level shapes.
- Error responses usually follow one of these forms:
  - `{ "error": "message" }`
  - `{ "error": { "message": "message" } }`

## System

### `GET /health`

```json
{
  "status": "healthy",
  "game": "Press & Influence - Five Grayon",
  "version": "1.0.0"
}
```

## Auth

### `POST /auth/register`

```json
{
  "access_token": "string|null",
  "refresh_token": "string|null",
  "email": "string",
  "name": "string",
  "level": 1,
  "xp": 0,
  "company": {
    "name": "string|null",
    "coins": 1000,
    "diamonds": 1575,
    "trust_score": 50,
    "unlocked_desks": 3,
    "unlocked_characters": [],
    "desk_assignments": {}
  }
}
```

### `POST /auth/login`

```json
{
  "access_token": "string|null",
  "refresh_token": "string|null",
  "email": "string",
  "name": "string",
  "level": 1,
  "xp": 0,
  "company": {
    "name": "string|null",
    "coins": 1000,
    "diamonds": 1575,
    "trust_score": 50,
    "unlocked_desks": 3,
    "unlocked_characters": [],
    "desk_assignments": {}
  }
}
```

### `POST /auth/refresh`

```json
{
  "access_token": "string|null",
  "refresh_token": "string|null"
}
```

### `POST /auth/logout`

```json
{
  "message": "Logged out successfully"
}
```

## Company

### `GET /company`

```json
{
  "name": "string|null",
  "coins": 1000,
  "diamonds": 1575,
  "trust_score": 50,
  "unlocked_desks": 3,
  "desk_characters": {},
  "characters": [
    {
      "name": "Bob",
      "skill": "Data Entry",
      "desc": "Reliable junior level worker.",
      "influence": 10,
      "timeliness": 40,
      "accuracy": 60,
      "rec": 100,
      "recur": 50
    }
  ],
  "hired_characters": [],
  "journalists": [
    {
      "id": "string",
      "name": "string",
      "skill": 1,
      "salary": 100,
      "loyalty": 50
    }
  ]
}
```

### `POST /company/create`

```json
{
  "name": "string|null",
  "coins": 1000,
  "diamonds": 1575,
  "trust_score": 50,
  "unlocked_desks": 3,
  "desk_characters": {},
  "characters": [],
  "message": "Company created"
}
```

### `POST /company/upgrade`

```json
{
  "next_desk_cost": 0,
  "coins_deducted": 0,
  "coins_remaining": 1000,
  "unlocked_desks": 3,
  "message": "Desk purchased"
}
```

## Journalists

### `GET /journalists`

```json
{
  "junior_characters": ["Bob", "Lisa"],
  "elite_characters": ["Robin", "Michael"],
  "unlocked": ["string"],
  "characters": {
    "Bob": {
      "skill": "Data Entry",
      "desc": "Reliable junior level worker.",
      "influence": 10,
      "timeliness": 40,
      "accuracy": 60,
      "rec": 100,
      "recur": 50
    }
  }
}
```

### `POST /journalists/hire`

Success:

```json
{
  "success": true,
  "character": "string",
  "payment_method": "coin",
  "cost": 600,
  "coins_remaining": 400,
  "unlocked_characters": ["string"],
  "desk_assignments": {},
  "message": "string hired and assigned"
}
```

Failure:

```json
{
  "success": false,
  "error": "insufficient_funds",
  "message": "Not enough coins. Need 600, have 400"
}
```

### `POST /journalists/fire`

```json
{
  "journalist": {
    "id": "string",
    "companyId": "string",
    "name": "string",
    "skill": 1,
    "salary": 100,
    "loyalty": 50,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

## Articles

### `GET /articles/history`

```json
{
  "articles": [
    {
      "id": "string",
      "tip_id": "news",
      "headline": "string",
      "strategy": "fast",
      "is_true": false,
      "is_fake": false,
      "quality": 1,
      "published_at": "2026-01-01T00:00:00.000Z",
      "trust_delta": null,
      "money_delta": null,
      "premium_delta": null,
      "sponsor_delta": null
    }
  ]
}
```

### `POST /articles/publish`

```json
{
  "ok": true,
  "result": {
    "tip": {
      "id": "news",
      "headline": "string",
      "is_true_chance": 0.5
    },
    "strategy": "fast",
    "is_true": false,
    "is_fake": false,
    "quality": 1,
    "attention": 100,
    "trust_delta": 0,
    "money_delta": 0,
    "subscriber_delta": 0,
    "premium_delta": 0,
    "sponsor_delta": 0,
    "coins_remaining": 1000,
    "trust_remaining": 50,
    "headline": "string"
  }
}
```

## Events

### `GET /events`

```json
{
  "has_active_tip": false,
  "tip": null,
  "message": "Awaiting next anonymous call...",
  "tip_cooldown_turns_remaining": 2,
  "active_investigation": null,
  "available_events": [
    {
      "id": "string",
      "headline": "string",
      "preview": "string",
      "difficulty": 1,
      "reward": 100,
      "risk": 1
    }
  ],
  "attention": null,
  "strategies": [
    {
      "id": 0,
      "title": "Fast Print",
      "cost": "Free",
      "time": "Instant",
      "risk": "High"
    }
  ]
}
```

### `POST /events/accept`

```json
{
  "success": true,
  "message": "Tip accepted: \"string\"",
  "has_active_tip": true,
  "tip": {
    "id": "string",
    "headline": "string",
    "preview": "string",
    "is_true_chance": null,
    "impact": {
      "stability": null,
      "corruption": null
    }
  }
}
```

### `POST /events/complete`

```json
{
  "ok": true,
  "result": {
    "tip": {
      "id": "string",
      "headline": "string"
    },
    "strategy": "accepted",
    "trust_delta": 0,
    "money_delta": 0,
    "subscriber_delta": 0,
    "premium_delta": 0,
    "headline": "string"
  }
}
```

## Economy

### `GET /economy`

```json
{
  "gdp": {
    "years": [1988, 1989, 1990, 1991, 1992, 1993],
    "values": [150, 60, 185, 140, 170, 220]
  },
  "inflation": {
    "years": [1988, 1989, 1990, 1991, 1992, 1993],
    "values": [40, 165, 75, 155, 55, 20]
  },
  "national_state": {
    "stability": 75,
    "corruption": 20,
    "public_trust": 0
  },
  "citizen_cohorts": {
    "elite": {
      "trust": 0
    }
  },
  "economy": {
    "money": 1000,
    "estimated_revenue": 0,
    "salary_expense": 0,
    "company_value": 1000
  }
}
```

### `GET /economy/stats`

```json
{
  "stats": {
    "labels": ["Trust", "Cash", "Journalists", "Sponsors", "Premium"],
    "values": ["50%", "$1.0K", "0", "1", "0"]
  }
}
```

### `GET /stats`

```json
{
  "match_active": true,
  "outlet": "string",
  "turn": 7,
  "max_turns": 40,
  "trust": 50,
  "money": 1000,
  "subscribers": 0,
  "company_value": 1000,
  "company_level": 1,
  "reputation": 50,
  "journalists": 0,
  "sponsors_standard": 1,
  "sponsors_premium": 0,
  "attention": 100,
  "national": {
    "stability": 75,
    "corruption": 20,
    "public_trust": 0
  },
  "stability_critical": false,
  "stability_timer_remaining": 10
}
```

## Leaderboard

### `GET /leaderboard`

```json
{
  "outlets": [
    {
      "rank": 1,
      "name": "string",
      "trust": 50,
      "money": 1000,
      "subscribers": 0,
      "score": 0,
      "grade": "Surviving"
    }
  ]
}
```

