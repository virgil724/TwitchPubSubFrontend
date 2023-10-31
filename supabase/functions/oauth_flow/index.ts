
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

const main = async (req) => {
  const { url, method } = req

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    // Supabase API URL - env var exported by default.
    Deno.env.get('SUPABASE_URL') ?? '',
    // Supabase API ANON KEY - env var exported by default.
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    // Create client with Auth context of the user that called the function.
    // This way your row-level-security (RLS) policies are applied.
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  const app = {
    client_id: Deno.env.get('TWITCH_CLIENT_ID') ?? '',
    client_secret: Deno.env.get('TWITCH_CLIENT_SECRET') ?? '',
  }


  const revoke_pattern = new URLPattern({ pathname: "/oauth_flow/revoke" })
  const refresh_pattern = new URLPattern({ pathname: "/oauth_flow/refresh" })
  if (revoke_pattern.test(url)) {

    try {
      const { data, error } = await supabaseClient
        .from("TwitchToken").select("access_token")
        .eq("user", user.id);
      console.log(data)
      data.forEach(element => {
        revokeOauthToken(app, element.access_token)

      });

      deleteDBToken(user, supabaseClient)
      return new Response(JSON.stringify({
        result: "Success"
      }), {
        status: 200,
        statusText: 'OK',
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
  }

  else if (refresh_pattern.test(url)) {
    console.log("Refresh Token Flow")
    const { oldToken } = await req.json();
    console.log(oldToken);

    const { data, error } = await supabaseClient.from("TwitchToken").select("refresh_token").eq("access_token",oldToken)

    console.log(data);


    const token = data[0].refresh_token
    const tokenResp = await refreshOauthToken(app, token)
    if (!tokenResp.ok) {
      await deleteDBTokenOnAccessToken(oldToken, supabaseClient)
      return new Response(JSON.stringify({ error: "need to ReAuth" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }
    else {
      const tokenData = await tokenResp.json()
      const {
        access_token,
        refresh_token,
        scope,
      } = tokenData
      const { data, error } = await supabaseClient.from("TwitchToken").update({
        access_token,
        refresh_token,
        scope: scope.join(','),
      }).eq("access_token", oldToken).select()

      return new Response(JSON.stringify({ result: "Success" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
      )
    }



  }
  else {
    try {
      console.log("GetTokenFlow")
      const { code } = await req.json()
      const oauthData = await getOauthToken(app, code)
      console.log(oauthData)
      const {
        access_token,
        refresh_token,
        scope,
        expires_in
      } = oauthData
      const expires_at = new Date(Date.now() + expires_in * 1000).toISOString()
      console.log(expires_at)

      const { data, error } = await supabaseClient
        .from('TwitchToken')
        .insert({
          access_token,
          refresh_token,
          scope: scope.join(','), // convert to string
          "expires_at": expires_at,
          user: user.id,
        })
      console.log(user)
      console.log(data)
      console.log(error)

      return new Response(JSON.stringify({
        result: "Success"
      }), {
        status: 200,
        statusText: 'OK',
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      });
    }

    catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })

    }
  }


}
const revokeOauthToken = async (app, token) => {
  const resp = await fetch("https://id.twitch.tv/oauth2/revoke", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: app.client_id,
      token: token
    })
  })
  if (!resp.ok) {
    throw new Error(resp.statusText);

  }
}
const deleteDBToken = async (user, supabaseClient) => {
  const { data, error } = await supabaseClient
    .from("TwitchToken")
    .delete()
    .eq("user", user.id);
  if (error) {
    throw new Error(error.error_description || error.message)
  }
}


const deleteDBTokenOnAccessToken = async (access_token, supabaseClient) => {
  const { data, error } = await supabaseClient
    .from("TwitchToken")
    .delete()
    .eq("access_token", access_token);
  if (error) {
    throw new Error(error.error_description || error.message)
  }
}

const refreshOauthToken = async (app, token) => {
  console.log(app)
  const body  = new URLSearchParams();
  body .append("grant_type", "refresh_token")
  body .append("refresh_token", token)
  body .append("client_id", app.client_id)
  body .append("client_secret", app.client_secret)
  const refreshToken = await fetch("https://id.twitch.tv/oauth2/token", {
    "method": "POST",
    "headers": {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: body 
  })

  return refreshToken
}
const getOauthToken = async (app, code) => {
  const params = new URLSearchParams({
    client_id: app.client_id,
    client_secret: app.client_secret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: "http://localhost:3000"
  })

  const Tokenresp = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, {
    method: 'POST'
  })
  if (!Tokenresp.ok) {
    throw new Error('API error')
  }

  const oauthData = await Tokenresp.json()
  return oauthData
}
const translateTwitchIdentifier = async (identifier, oauthData, type = 'id') => {

  let paramName, key

  if (type === 'id') {
    paramName = 'login'
    key = 'id'
  } else {
    paramName = 'id'
    key = 'login'
  }

  const params = new URLSearchParams({
    [paramName]: identifier
  })

  const url = `https://api.twitch.tv/helix/users?${params}`

  const response = await fetch(url, {/* auth headers */ })
  const json = await response.json()

  const user = json.data[0]
  if (!user) throw 'User not found'

  return user[key]

}

serve(main)
