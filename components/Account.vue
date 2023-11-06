<script setup>
const supabase = useSupabaseClient();

const loading = ref(true);
const username = ref("");
const website = ref("");
const avatar_path = ref("");
const twitch = ref("");
loading.value = true;
const user = useSupabaseUser();

let { data } = await supabase
  .from("profiles")
  .select(`username, website, avatar_url,login_id`)
  .eq("id", user.value.id)
  .single();

if (data) {
  username.value = data.username;
  website.value = data.website;
  avatar_path.value = data.avatar_url;
}

let { count, error } = await supabase
  .from("TwitchToken")
  .select(`id`, { count: "exact" });
const TokenCount = ref(0);
TokenCount.value = count;
loading.value = false;

async function updateProfile() {
  try {
    loading.value = true;
    const user = useSupabaseUser();

    const updates = {
      id: user.value.id,
      username: username.value,
      website: website.value,
      avatar_url: avatar_path.value,
      updated_at: new Date(),
    };

    let { error } = await supabase.from("profiles").upsert(updates, {
      returning: "minimal", // Don't return the value after inserting
    });
    if (error) throw error;
  } catch (error) {
    alert(error.message);
  } finally {
    loading.value = false;
  }
}

const oauthLink = computed(() => {
  const clientid = "bof52f7lxgz7m7o5xetdogxif4nrmd";
  const redirect_uri = "https://twitchtool.pages.dev/twitch_oauth";
  const response_type = "code";
  const scope = [
    "bits:read",
    "channel:read:subscriptions",
    "channel:read:redemptions",
  ];
  const baseURL = new URL("https://id.twitch.tv/oauth2/authorize");
  baseURL.searchParams.append("client_id", clientid);
  baseURL.searchParams.append("redirect_uri", redirect_uri);
  baseURL.searchParams.append("response_type", response_type);
  const scopeString = scope.join(" ");
  baseURL.searchParams.append("scope", scopeString);
  return baseURL.toString();
});

const twitchConnect = computed(() => {
  return TokenCount.value ? "Connected" : "Connect to Twitch";
});
const TwitchConnectDisable = computed(() => {
  return TokenCount.value ? true : false;
});
const route = useRoute();

async function signOut() {
  try {
    loading.value = true;
    let { error } = await supabase.auth.signOut();
    if (error) throw error;
    user.value = null;
  } catch (error) {
    alert(error.message);
  } finally {
    loading.value = false;
  }
}
const connectTwitchBtnHandler = async () => {
  await updateProfile();
  window.location = oauthLink.value;
};
const sendOauthCode = async () => {
  loading.value = true;
  const router = useRouter();
  const { data, error } = await supabase.functions.invoke("oauth_flow", {
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: route.query.code }),
    method: "POST",
  });
  if (!error) {
    loading.value = false;
    TokenCount.value++;
  }
  loading.value = false;

  router.replace("/");
};
const ConnectDisable = ref(true);
const SetTrue = () => {
  ConnectDisable.value = true;
};
const setFalse = () => {
  ConnectDisable.value = false;
};
const DeleteToken = async () => {
  const { data, error } = await supabase
    .from("TwitchToken")
    .delete()
    .eq("user", user.value.id);
  if (!error) {
    TokenCount.value = 0;
  } else {
    alert(error.error_description || error.message);
  }
};
const RevokeToken = async () => {
  const { data, error } = await supabase.functions.invoke("oauth_flow/revoke");
  if (!error) {
    TokenCount.value = 0;
  } else {
    alert(error.error_description || error.message);
  }
};
onMounted(() => {
  if (route.path == "/twitch_oauth") {
    sendOauthCode();
  }
});

// Access baseURL universally
</script>

<template>
  {{ baseURL }}
  <!-- <v-btn @click="RevokeToken"></v-btn> -->
  <v-form class="form-widget p-1" @submit.prevent="updateProfile">
    <div>
      <label for="email">Email</label>
      <v-text-field id="email" type="text" :value="user.email" disabled />
    </div>
    <div>
      <label for="username">TwitchUserName</label>
      <v-text-field id="username" type="text" v-model="username" />
    </div>
    <!-- <div>
      <label for="website">Website</label>
      <v-text-field id="website" type="url" v-model="website" />
    </div> -->

    <div>
      <v-btn
        type="submit"
        class="my-2"
        :text="loading ? 'Loading ...' : 'Update'"
        :disabled="loading"
      />
    </div>
    <div
      v-if="username !== ''"
      class="my-2"
      @mouseover="setFalse"
      @mouseleave="SetTrue"
    >
      <v-btn
        v-show="ConnectDisable || !TokenCount"
        :disabled="TwitchConnectDisable || loading"
        :color="TwitchConnectDisable ? 'green' : 'primary'"
        @click="connectTwitchBtnHandler"
        >{{ twitchConnect }}</v-btn
      >
      <v-btn
        color="red"
        v-show="!ConnectDisable && TokenCount"
        @click="RevokeToken"
      >
        Delete Token?
      </v-btn>
    </div>
    <div class="my-2">
      <v-btn @click="signOut" :disabled="loading" color="red">Sign Out</v-btn>
    </div>
  </v-form>
</template>
