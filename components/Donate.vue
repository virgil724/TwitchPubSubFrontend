<script setup>
import { toPng } from "html-to-image";

const supabase = useSupabaseClient();

const donate = reactive({});
const autocomplete = ref([]);
const filter = ref("");
const update_autocompletevalue = () => {
  const yearDates = new Set();
  for (const item of donate.GiftSubs) {
    yearDates.add(item["year_date"]);
  }
  for (const item of donate.bits) {
    yearDates.add(item["year_date"]);
  }
  autocomplete.value = [...yearDates];
};

let data;
({ data } = await supabase
  .from("SubsSumNonGift")
  .select("sub_month,user_name"));
if (data) {
  donate.KeepSubs = data;
}
({ data } = await supabase
  .from("SubsCountGiftbyMonth")
  .select("gift_count,user_name,year_date"));
if (data) {
  donate.GiftSubs = data;
}

({ data } = await supabase
  .from("BitsCountbyMonth")
  .select("bits_used,user_name,year_date"));

if (data) {
  donate.bits = data;
  update_autocompletevalue();
}

const filterGift = computed(() => {
  if (filter.value === null || filter.value === "") {
    return donate.GiftSubs;
  }
  return donate.GiftSubs.filter((item) => {
    return item["year_date"] === filter.value;
  });
});
const filterBits = computed(() => {
  if (filter.value === null || filter.value === "") {
    return donate.bits;
  }
  return donate.bits.filter((item) => {
    return item["year_date"] === filter.value;
  });
});
const DonateDom = ref(null);
const DownloadPng = () => {
  toPng(DonateDom.value, { cacheBust: true })
    .then((dataUrl) => {
      const link = document.createElement("a");
      link.download = "my-image-name.png";
      link.href = dataUrl;
      link.click();
    })
    .catch((err) => {
      console.log(err);
    });
};
</script>
<template>
  <!-- <v-btn @click="DownloadPng">Download</v-btn> -->
  <div ref="DonateDom">
    <v-card title="持續訂閱" class="my-5">
      <v-table>
        <thead>
          <tr>
            <th class="text-left">持續月份</th>
            <th class="text-left">贊助者帳號</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in donate.KeepSubs" :key="item.user_name">
            <td>{{ item.sub_month }}</td>
            <td>{{ item.user_name }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
    <v-row>
      <v-col>
        <v-card title="贈送訂閱" class="my-5">
          <v-card-title> </v-card-title>
          <v-table>
            <thead>
              <tr>
                <th class="text-left">數量</th>
                <th class="text-left">贊助者帳號</th>
                <th class="text-left">年-月</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filterGift" :key="item.user_name">
                <td>{{ item.gift_count }}</td>
                <td>{{ item.user_name }}</td>
                <td>{{ item.year_date }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
      <v-col>
        <v-card title="小奇點" class="my-5">
          <v-card-title> </v-card-title>
          <v-table>
            <thead>
              <tr>
                <th class="text-left">數量</th>
                <th class="text-left">贊助者帳號</th>
                <th class="text-left">年-月</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filterBits" :key="item.user_name">
                <td>{{ item.bits_used }}</td>
                <td>{{ item.user_name }}</td>
                <td>{{ item.year_date }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>
  </div>
  <v-autocomplete
    v-model="filter"
    :items="autocomplete"
    label="過濾"
  ></v-autocomplete>
</template>
