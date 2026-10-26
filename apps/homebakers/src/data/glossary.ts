export const glossaryCategories = [
  "전체",
  "재료",
  "도구",
  "기법",
  "반죽·제품",
  "상태·온도",
] as const;

export type GlossaryCategory = Exclude<
  (typeof glossaryCategories)[number],
  "전체"
>;

export type GlossaryTerm = {
  term: string;
  english?: string;
  category: GlossaryCategory;
  meaning: string;
  tip?: string;
  aliases?: string[];
};

export const glossary: GlossaryTerm[] = [
  // 재료
  {
    term: "박력분",
    english: "cake flour",
    category: "재료",
    meaning:
      "단백질 함량이 낮은(약 7~9%) 밀가루로 글루텐이 적게 생겨 부드럽고 가벼운 식감을 냅니다.",
    tip: "케이크, 쿠키, 머핀, 마들렌에 씁니다.",
    aliases: ["박력 밀가루", "박력쌀가루", "연질밀"],
  },
  {
    term: "중력분",
    english: "all-purpose flour",
    category: "재료",
    meaning: "단백질 함량이 중간(약 9~11%)인 범용 밀가루입니다.",
    tip: "박력분이 없을 때 쿠키·팬케이크에 대신 쓸 수 있지만 조금 더 쫀득해져요.",
    aliases: ["다목적 밀가루", "AP flour"],
  },
  {
    term: "강력분",
    english: "bread flour",
    category: "재료",
    meaning:
      "단백질 함량이 높은(약 12~14%) 밀가루로 글루텐이 잘 형성돼 쫄깃하고 볼륨 있는 빵을 만듭니다.",
    tip: "식빵, 바게트, 베이글, 피자 도우에 씁니다.",
    aliases: ["빵가루 밀가루", "bread flour"],
  },
  {
    term: "통밀가루",
    english: "whole wheat flour",
    category: "재료",
    meaning:
      "밀의 겉껍질과 배아까지 함께 갈아 만든 가루로 구수하고 식이섬유가 많습니다.",
    tip: "흡수율이 높아 수분을 조금 더 넣어야 할 때가 많아요.",
    aliases: ["전밀분", "그레이엄 가루"],
  },
  {
    term: "아몬드 가루",
    english: "almond flour",
    category: "재료",
    meaning:
      "껍질을 벗긴 아몬드를 곱게 간 가루로 고소한 풍미와 촉촉함을 더합니다.",
    tip: "마카롱, 피낭시에, 타르트 크림(프랑지판)에 자주 씁니다.",
    aliases: ["아몬드파우더", "almond meal", "알몬드"],
  },
  {
    term: "베이킹파우더",
    english: "baking powder",
    category: "재료",
    meaning:
      "산성 물질과 탄산수소나트륨이 섞인 화학적 팽창제로 수분과 열을 만나면 가스를 만들어 반죽을 부풀립니다.",
    tip: "밀가루와 함께 체 쳐서 넣으면 고르게 섞여요.",
    aliases: ["BP", "베파", "팽창제"],
  },
  {
    term: "베이킹소다",
    english: "baking soda",
    category: "재료",
    meaning:
      "탄산수소나트륨. 버터밀크·요거트·초콜릿 같은 산성 재료와 만나야 팽창하며, 갈색 색감과 쿠키의 퍼짐을 돕습니다.",
    tip: "베이킹파우더와 달라서 1:1로 바꾸면 쓴맛이 날 수 있어요.",
    aliases: ["중탄산나트륨", "탄산수소나트륨", "소다"],
  },
  {
    term: "이스트",
    english: "yeast",
    category: "재료",
    meaning:
      "당을 먹고 이산화탄소와 알코올을 만드는 효모균으로 빵을 부풀리고 풍미를 줍니다.",
    tip: "생이스트, 인스턴트 드라이이스트, 액티브 드라이이스트가 있고 사용량이 달라요.",
    aliases: ["효모", "드라이이스트", "생이스트", "인스턴트 이스트"],
  },
  {
    term: "천연발효종",
    english: "sourdough starter",
    category: "재료",
    meaning:
      "밀가루와 물을 발효시켜 키운 야생 효모와 유산균 배양물로, 사워도우 빵의 발효와 신맛의 바탕이 됩니다.",
    tip: "정기적으로 먹이(리프레시)를 줘야 활성이 유지돼요.",
    aliases: ["르방", "르뱅", "사워도우 스타터", "스타터", "levain"],
  },
  {
    term: "무염버터",
    english: "unsalted butter",
    category: "재료",
    meaning:
      "소금이 들어가지 않은 버터. 짠맛을 조절하기 쉬워 제과·제빵 레시피의 기본으로 쓰입니다.",
    aliases: ["버터", "unsalted"],
  },
  {
    term: "발효버터",
    english: "cultured butter",
    category: "재료",
    meaning:
      "크림을 유산균으로 발효시켜 만든 버터로 깊은 향과 은은한 산미가 있습니다.",
    aliases: ["cultured butter", "프랑스 버터"],
  },
  {
    term: "휘핑크림",
    english: "heavy cream",
    category: "재료",
    meaning:
      "유지방 35% 안팎의 생크림. 차갑게 휘핑하면 부피가 커지고 단단해집니다.",
    tip: "식물성은 안정적이지만 풍미는 동물성이 더 좋아요.",
    aliases: [
      "생크림",
      "동물성 크림",
      "whipping cream",
      "heavy whipping cream",
    ],
  },
  {
    term: "설탕",
    english: "sugar",
    category: "재료",
    meaning:
      "단맛뿐 아니라 수분 유지, 갈변, 식감 부드러움에도 영향을 주는 기본 재료입니다.",
    aliases: ["백설탕", "정백당", "granulated sugar"],
  },
  {
    term: "슈거파우더",
    english: "powdered sugar",
    category: "재료",
    meaning: "설탕을 아주 곱게 간 가루로, 글레이즈와 데코레이션에 씁니다.",
    tip: "전분이 섞여 있어 뭉치기 쉬우니 체 쳐서 쓰세요.",
    aliases: ["분당", "아이싱 슈거", "confectioners' sugar", "icing sugar"],
  },
  {
    term: "황설탕",
    english: "brown sugar",
    category: "재료",
    meaning: "당밀이 남아 있는 설탕으로 진한 풍미와 촉촉함, 짙은 색을 줍니다.",
    aliases: ["흑설탕", "light brown sugar", "마스코바도"],
  },
  {
    term: "트레할로스",
    english: "trehalose",
    category: "재료",
    meaning:
      "설탕보다 단맛이 약하고 수분을 잘 잡아주는 당. 쿠키와 케이크의 촉촉함·보존성을 높이는 데 씁니다.",
    aliases: ["트레할로즈"],
  },
  {
    term: "물엿",
    english: "glucose syrup",
    category: "재료",
    meaning:
      "전분을 당화해 만든 점성 있는 시럽으로 촉촉함을 유지하고 결정화를 막아줍니다.",
    aliases: ["시럽", "corn syrup", "올리고당"],
  },
  {
    term: "전화당",
    english: "invert sugar",
    category: "재료",
    meaning:
      "설탕을 포도당과 과당으로 분해한 시럽으로 수분 보유력이 뛰어나 마들렌·까눌레 등에 촉촉함을 더합니다.",
    aliases: ["트리몰린", "trimoline", "invert syrup"],
  },
  {
    term: "코코아파우더",
    english: "cocoa powder",
    category: "재료",
    meaning:
      "카카오 매스에서 지방(카카오버터)을 대부분 제거해 가루로 만든 것으로 초콜릿 풍미를 줍니다.",
    tip: "무가당(unsweetened)과 가당 제품을 구분해 쓰세요.",
    aliases: ["코코아", "카카오 파우더", "cacao"],
  },
  {
    term: "커버춰 초콜릿",
    english: "couverture chocolate",
    category: "재료",
    meaning:
      "카카오버터 함량이 높아 녹였을 때 흐름이 좋고 윤기가 나는 제과용 초콜릿입니다.",
    aliases: ["커버처", "쿠베르튀르", "couverture"],
  },
  {
    term: "바닐라빈",
    english: "vanilla bean",
    category: "재료",
    meaning:
      "바닐라 꼬투리. 안의 씨를 긁어 크림이나 반죽에 넣으면 깊은 향이 납니다.",
    tip: "남은 꼬투리는 설탕에 묻어 바닐라슈거로 활용할 수 있어요.",
    aliases: [
      "바닐라",
      "바닐라 빈",
      "vanilla pod",
      "바닐라 익스트랙트",
      "vanilla extract",
    ],
  },
  {
    term: "젤라틴",
    english: "gelatin",
    category: "재료",
    meaning:
      "동물성 단백질로 만든 응고제. 찬물에 불린 뒤 녹여 무스·젤리를 굳힙니다.",
    aliases: ["판젤라틴", "가루젤라틴", "gelatine"],
  },
  {
    term: "크림치즈",
    english: "cream cheese",
    category: "재료",
    meaning:
      "부드럽고 산미가 있는 생치즈. 치즈케이크와 프로스팅의 기본 재료입니다.",
    aliases: ["치즈", "cream cheese"],
  },
  {
    term: "마스카포네",
    english: "mascarpone",
    category: "재료",
    meaning:
      "크림을 응고시켜 만든 이탈리아 생치즈로 진하고 부드러우며 티라미수에 쓰입니다.",
    aliases: ["마스카르포네", "mascarpone cheese"],
  },
  {
    term: "소금",
    english: "salt",
    category: "재료",
    meaning:
      "맛을 또렷하게 하고, 빵에서는 글루텐을 강화하고 발효 속도를 조절합니다.",
    aliases: ["천일염", "꽃소금", "salt"],
  },

  // 도구
  {
    term: "스크래퍼",
    english: "bench scraper",
    category: "도구",
    meaning: "반죽을 자르거나 모으고, 작업대에서 떼어내는 직사각형 도구입니다.",
    aliases: ["스크레이퍼", "도우 스크래퍼", "dough scraper"],
  },
  {
    term: "스패출러",
    english: "spatula",
    category: "도구",
    meaning:
      "반죽을 섞고 긁는 실리콘 주걱, 또는 크림을 펴 바르는 평평한 도구를 부르는 말입니다.",
    aliases: ["스패츌라", "실리콘 주걱", "주걱", "rubber spatula"],
  },
  {
    term: "오프셋 스패출러",
    english: "offset spatula",
    category: "도구",
    meaning:
      "손잡이와 날 사이에 단차가 있어 케이크 위 크림을 매끄럽게 바르거나 반죽을 옮기기 좋은 도구입니다.",
    aliases: ["스패출러", "팔레트나이프", "palette knife"],
  },
  {
    term: "거품기",
    english: "whisk",
    category: "도구",
    meaning:
      "달걀이나 크림에 공기를 넣어 거품을 내거나 재료를 섞는 도구입니다.",
    aliases: ["휘퍼", "whipper", "휘핑기", "whisk"],
  },
  {
    term: "핸드믹서",
    english: "hand mixer",
    category: "도구",
    meaning:
      "손에 들고 쓰는 전동 거품기. 머랭이나 휘핑크림을 만들 때 편리합니다.",
    aliases: ["핸드 믹서", "전동 거품기"],
  },
  {
    term: "스탠드믹서",
    english: "stand mixer",
    category: "도구",
    meaning:
      "볼이 고정된 전동 믹서로 반죽 치대기, 휘핑, 크리밍을 오래 안정적으로 할 수 있습니다.",
    aliases: ["스탠드 믹서", "반죽기", "키친에이드"],
  },
  {
    term: "체",
    english: "sieve",
    category: "도구",
    meaning:
      "가루의 덩어리를 풀고 이물질을 거르는 도구로 가루를 공기와 섞어줍니다.",
    aliases: ["채", "가루체", "sifter", "sift", "sieve"],
  },
  {
    term: "짤주머니",
    english: "piping bag",
    category: "도구",
    meaning:
      "반죽이나 크림을 짜서 모양을 내는 주머니로 깍지를 끼워 사용합니다.",
    aliases: ["파이핑백", "깍지", "piping tip", "nozzle", "노즐"],
  },
  {
    term: "유산지",
    english: "parchment paper",
    category: "도구",
    meaning:
      "기름과 수분에 강한 종이. 팬에 깔아 반죽이 달라붙지 않고 쉽게 떼어지게 합니다.",
    aliases: ["종이호일", "베이킹 페이퍼", "parchment", "cooking paper"],
  },
  {
    term: "실리콘 매트",
    english: "silicone baking mat",
    category: "도구",
    meaning: "오븐 팬에 깔아 쓰는 재사용 가능한 논스틱 매트입니다.",
    aliases: ["실패트", "실팻", "silpat", "baking mat"],
  },
  {
    term: "식힘망",
    english: "cooling rack",
    category: "도구",
    meaning:
      "구운 빵과 과자를 올려 아래로 공기가 통하게 식히는 망. 바닥에 물기가 차는 것을 막아줍니다.",
    aliases: ["쿨링랙", "식힘 망", "cooling rack", "wire rack"],
  },
  {
    term: "디지털 저울",
    english: "digital scale",
    category: "도구",
    meaning:
      "재료를 그램 단위로 정확히 재는 저울. 베이킹은 부피보다 무게 계량이 정확합니다.",
    aliases: ["저울", "scale"],
  },
  {
    term: "오븐 온도계",
    english: "oven thermometer",
    category: "도구",
    meaning:
      "오븐 내부의 실제 온도를 확인하는 온도계로, 오븐 표시 온도와의 차이를 알 수 있습니다.",
    aliases: ["오븐온도계", "온도계"],
  },
  {
    term: "베넷",
    english: "lame",
    category: "도구",
    meaning:
      "사워도우나 바게트 표면에 칼집(쿠프)을 내는 얇은 날이 달린 도구입니다.",
    aliases: ["램", "쿠프 칼", "빵칼", "lame", "bread lame"],
  },
  {
    term: "발효 바구니",
    english: "banneton",
    category: "도구",
    meaning:
      "빵 반죽을 마지막 발효시킬 때 모양을 잡아주는 바구니. 겉면에 밀가루 무늬가 남습니다.",
    aliases: ["바네통", "반네통", "proofing basket", "브로드폼"],
  },
  {
    term: "무쇠 냄비",
    english: "dutch oven",
    category: "도구",
    meaning:
      "뚜껑이 있는 두꺼운 냄비. 집 오븐에서 스팀을 가둬 바삭한 사워도우 빵을 굽는 데 씁니다.",
    aliases: ["더치오븐", "주물 냄비", "dutch oven", "르크루제"],
  },

  // 기법
  {
    term: "크리밍",
    english: "creaming",
    category: "기법",
    meaning:
      "부드러운 버터와 설탕을 섞어 공기를 넣으며 하얗고 폭신하게 만드는 작업입니다.",
    tip: "버터는 손가락으로 눌러 자국이 날 정도(약 18~22℃)가 알맞아요.",
    aliases: ["크림화", "creaming method"],
  },
  {
    term: "폴딩",
    english: "folding",
    category: "기법",
    meaning:
      "거품을 꺼뜨리지 않도록 주걱으로 바닥에서 위로 퍼 올리며 부드럽게 섞는 방법입니다.",
    aliases: ["접듯이 섞기", "fold", "자르듯이 섞기", "커팅 앤 폴딩"],
  },
  {
    term: "휘핑",
    english: "whipping",
    category: "기법",
    meaning: "달걀, 크림 등에 공기를 넣어 거품을 내는 작업입니다.",
    aliases: ["거품내기", "whip", "whisking"],
  },
  {
    term: "체 치기",
    english: "sifting",
    category: "기법",
    meaning: "가루를 체에 내려 덩어리를 풀고 공기를 넣는 과정입니다.",
    aliases: ["체질", "체치기", "sift"],
  },
  {
    term: "치대기",
    english: "kneading",
    category: "기법",
    meaning:
      "반죽을 밀고 접으며 글루텐을 형성시켜 탄력 있는 반죽으로 만드는 작업입니다.",
    aliases: ["니딩", "반죽하기", "knead", "kneading"],
  },
  {
    term: "오토리즈",
    english: "autolyse",
    category: "기법",
    meaning:
      "밀가루와 물만 먼저 섞어 휴지시킨 뒤 나머지 재료를 넣는 방법. 글루텐이 자연스럽게 생겨 반죽이 매끄러워집니다.",
    aliases: ["오토리즈 휴지", "autolyze", "오토라이즈"],
  },
  {
    term: "스트레치 앤 폴드",
    english: "stretch and fold",
    category: "기법",
    meaning:
      "반죽을 늘려 접는 동작을 반복해 치대지 않고도 글루텐 구조를 만드는 방법입니다. 사워도우에서 많이 씁니다.",
    aliases: ["스트레치앤폴드", "S&F", "접기", "폴드", "coil fold"],
  },
  {
    term: "펀칭",
    english: "punching down",
    category: "기법",
    meaning:
      "1차 발효 중 반죽을 눌러 가스를 빼고 온도와 발효 상태를 고르게 하는 작업입니다.",
    aliases: ["가스 빼기", "펀치", "punch down", "degas"],
  },
  {
    term: "성형",
    english: "shaping",
    category: "기법",
    meaning: "분할한 반죽을 원하는 모양으로 만드는 작업입니다.",
    aliases: ["모양 잡기", "shaping", "둥글리기", "preshape"],
  },
  {
    term: "쿠프",
    english: "scoring",
    category: "기법",
    meaning:
      "굽기 직전 빵 표면에 칼집을 내는 일. 팽창 방향을 정해주고 터짐을 예쁘게 만듭니다.",
    aliases: ["스코어링", "scoring", "칼집", "coupe"],
  },
  {
    term: "1차 발효",
    english: "bulk fermentation",
    category: "기법",
    meaning:
      "반죽을 한 덩어리로 두고 처음 부풀리는 발효. 풍미와 구조를 만드는 핵심 단계입니다.",
    aliases: [
      "일차 발효",
      "벌크 발효",
      "bulk",
      "first rise",
      "primary fermentation",
    ],
  },
  {
    term: "2차 발효",
    english: "proofing",
    category: "기법",
    meaning: "성형한 반죽을 굽기 전 한 번 더 부풀리는 발효입니다.",
    aliases: [
      "이차 발효",
      "최종 발효",
      "프루핑",
      "proof",
      "final proof",
      "홈 프루핑",
    ],
  },
  {
    term: "저온 숙성",
    english: "cold retard",
    category: "기법",
    meaning:
      "반죽을 냉장고에서 천천히 발효시키는 방법. 풍미가 깊어지고 시간 관리가 쉬워집니다.",
    aliases: ["냉장 발효", "리타딩", "retard", "cold ferment", "오버나이트"],
  },
  {
    term: "휴지",
    english: "resting",
    category: "기법",
    meaning:
      "반죽을 잠시 두어 글루텐을 이완시키고 수분을 고르게 퍼지게 하는 시간입니다.",
    tip: "쿠키·타르트 반죽은 냉장 휴지로 버터를 굳혀 모양을 유지해요.",
    aliases: ["레스팅", "rest", "벤치 타임", "bench rest"],
  },
  {
    term: "블라인드 베이킹",
    english: "blind baking",
    category: "기법",
    meaning:
      "필링 없이 타르트 쉘만 먼저 굽는 방법. 바닥이 눅눅해지지 않고 바삭해집니다.",
    tip: "파이 웨이트(누름돌)로 눌러서 구워요.",
    aliases: ["공구이", "타르트 쉘 굽기", "blind bake", "파이 웨이트"],
  },
  {
    term: "템퍼링",
    english: "tempering",
    category: "기법",
    meaning:
      "초콜릿을 녹이고 식히고 다시 올리는 온도 조절로 카카오버터 결정을 안정시켜 윤기와 스냅감을 내는 작업입니다. 달걀을 따뜻한 액체에 조금씩 섞어 응고를 막는 작업도 템퍼링이라 합니다.",
    aliases: ["초콜릿 템퍼링", "tempering chocolate", "온도 맞추기"],
  },
  {
    term: "라미네이팅",
    english: "laminating",
    category: "기법",
    meaning:
      "반죽 사이에 버터를 넣고 접고 밀기를 반복해 얇은 층을 만드는 기법입니다. 크루아상과 퍼프 페이스트리의 결을 만들어요.",
    aliases: ["라미네이션", "lamination", "접어밀기", "투르", "tour"],
  },
  {
    term: "데코레이션",
    english: "decorating",
    category: "기법",
    meaning: "크림·과일·초콜릿 등으로 완성된 제품을 꾸미는 작업입니다.",
    aliases: ["장식", "디코", "decoration"],
  },
  {
    term: "글레이징",
    english: "glazing",
    category: "기법",
    meaning:
      "윤기나 코팅을 위해 표면에 시럽·아이싱·달걀물 등을 바르는 일입니다.",
    aliases: ["글레이즈", "glaze", "코팅", "나파주", "nappage"],
  },
  {
    term: "달걀물 바르기",
    english: "egg wash",
    category: "기법",
    meaning:
      "굽기 전 표면에 달걀(또는 노른자+우유)을 발라 먹음직한 갈색과 윤기를 내는 방법입니다.",
    aliases: ["에그워시", "egg wash", "washing", "노른자 바르기"],
  },
  {
    term: "중탕",
    english: "double boiler",
    category: "기법",
    meaning:
      "뜨거운 물이 담긴 냄비 위에 그릇을 올려 간접적으로 가열하는 방법으로 초콜릿이나 버터를 태우지 않고 녹일 수 있습니다.",
    aliases: [
      "더블보일러",
      "bain-marie",
      "bain marie",
      "water bath",
      "베인마리",
    ],
  },
  {
    term: "캐러멜라이징",
    english: "caramelizing",
    category: "기법",
    meaning:
      "설탕을 가열해 갈색으로 녹이며 단맛과 쌉싸름한 풍미를 만드는 과정입니다.",
    aliases: ["카라멜화", "캐러멜화", "caramelize"],
  },
  {
    term: "마세레이트",
    english: "macerating",
    category: "기법",
    meaning: "과일에 설탕이나 술을 섞어 재워 즙과 향이 우러나게 하는 일입니다.",
    aliases: ["마리네이드", "macerate", "재우기", "절이기"],
  },

  // 반죽·제품
  {
    term: "글루텐",
    english: "gluten",
    category: "반죽·제품",
    meaning:
      "밀가루 단백질이 물과 만나 치대어지면서 생기는 그물 구조. 반죽에 탄력과 쫄깃함을 주고 가스를 가둡니다.",
    aliases: ["gluten", "글루텐 형성"],
  },
  {
    term: "머랭",
    english: "meringue",
    category: "반죽·제품",
    meaning:
      "달걀흰자에 설탕을 넣어 단단하게 휘핑한 거품입니다. 프렌치·이탈리안·스위스 방식이 있습니다.",
    tip: "그릇에 기름기나 노른자가 묻으면 거품이 잘 안 올라와요.",
    aliases: [
      "meringue",
      "흰자 거품",
      "프렌치 머랭",
      "이탈리안 머랭",
      "스위스 머랭",
    ],
  },
  {
    term: "버터크림",
    english: "buttercream",
    category: "반죽·제품",
    meaning:
      "버터를 기본으로 설탕·달걀 등을 섞어 만든 케이크 샌드·프로스팅용 크림입니다.",
    aliases: ["buttercream", "프로스팅", "frosting"],
  },
  {
    term: "가나슈",
    english: "ganache",
    category: "반죽·제품",
    meaning:
      "초콜릿과 따뜻한 생크림을 섞어 만든 크림. 비율에 따라 글레이즈, 필링, 트러플 등에 씁니다.",
    aliases: ["ganache", "가나쉬"],
  },
  {
    term: "커스터드 크림",
    english: "pastry cream",
    category: "반죽·제품",
    meaning:
      "우유, 달걀노른자, 설탕, 전분을 끓여 만든 크림. 슈, 타르트, 에클레어의 필링으로 쓰입니다.",
    aliases: [
      "파티시에르",
      "crème pâtissière",
      "creme patissiere",
      "pastry cream",
      "커스터드",
    ],
  },
  {
    term: "프랑지판",
    english: "frangipane",
    category: "반죽·제품",
    meaning:
      "아몬드 가루, 버터, 설탕, 달걀로 만든 고소한 아몬드 크림. 타르트 속에 채워 굽습니다.",
    aliases: ["크렘다망드", "크렘 다망드", "crème d'amande", "almond cream"],
  },
  {
    term: "슈",
    english: "choux",
    category: "반죽·제품",
    meaning:
      "물, 버터, 밀가루를 익힌 반죽에 달걀을 섞어 구운 빈 껍질. 수증기로 속이 비도록 부풀어요.",
    aliases: [
      "파트 아 슈",
      "pâte à choux",
      "choux pastry",
      "슈 반죽",
      "에클레어",
      "éclair",
    ],
  },
  {
    term: "쇼트크러스트",
    english: "shortcrust pastry",
    category: "반죽·제품",
    meaning:
      "버터 비율이 높고 물이 적은 바삭한 반죽. 타르트·파이 크러스트에 씁니다.",
    aliases: [
      "파트 슈크레",
      "파트 사블레",
      "파트 브리제",
      "pâte sucrée",
      "pâte brisée",
      "shortcrust",
      "타르트 반죽",
    ],
  },
  {
    term: "퍼프 페이스트리",
    english: "puff pastry",
    category: "반죽·제품",
    meaning:
      "버터와 반죽을 여러 번 접어 밀어 구우면 수십 겹으로 부풀어 오르는 반죽입니다.",
    aliases: ["파이 반죽", "푀유테", "feuilletage", "puff"],
  },
  {
    term: "비에누아즈리",
    english: "viennoiserie",
    category: "반죽·제품",
    meaning:
      "버터와 달걀이 들어간 달콤한 발효 페이스트리 종류. 크루아상, 브리오슈, 뺑오쇼콜라 등이 해당합니다.",
    aliases: ["viennoiserie", "크루아상", "브리오슈", "뺑오쇼콜라", "크로와상"],
  },
  {
    term: "제누와즈",
    english: "genoise",
    category: "반죽·제품",
    meaning:
      "달걀 전체를 휘핑해 만든 스펀지 케이크. 버터를 소량 넣어 촉촉한 시트를 만듭니다.",
    aliases: ["제노와즈", "genoise", "스펀지 케이크", "sponge cake", "공립법"],
  },
  {
    term: "쉬폰 케이크",
    english: "chiffon cake",
    category: "반죽·제품",
    meaning: "식용유와 머랭을 함께 쓰는 아주 가볍고 폭신한 케이크입니다.",
    aliases: ["시폰", "chiffon", "쉬폰"],
  },
  {
    term: "파운드케이크",
    english: "pound cake",
    category: "반죽·제품",
    meaning:
      "버터·설탕·달걀·밀가루를 각각 같은 무게로 쓰는 데서 이름이 붙은 묵직하고 촉촉한 케이크입니다.",
    aliases: ["pound cake", "파운드"],
  },
  {
    term: "마들렌",
    english: "madeleine",
    category: "반죽·제품",
    meaning:
      "조개 모양 틀에 구운 프랑스 구움과자로, 가운데가 볼록하게 솟는 '배꼽'이 특징입니다.",
    tip: "반죽을 하루 숙성시키면 배꼽이 더 예쁘게 올라와요.",
    aliases: ["madeleines", "마들렌 배꼽"],
  },
  {
    term: "피낭시에",
    english: "financier",
    category: "반죽·제품",
    meaning:
      "브라운 버터와 아몬드 가루, 달걀흰자로 만든 금괴 모양의 구움과자입니다.",
    aliases: ["financier", "휘낭시에", "휘낭시"],
  },
  {
    term: "까눌레",
    english: "canelé",
    category: "반죽·제품",
    meaning:
      "럼과 바닐라를 넣은 묽은 반죽을 구리 틀에서 구워 겉은 짙고 바삭, 속은 촉촉한 프랑스 과자입니다.",
    aliases: ["canele", "카눌레", "canelés"],
  },
  {
    term: "스콘",
    english: "scone",
    category: "반죽·제품",
    meaning:
      "차가운 버터를 가루에 섞어 만드는 영국식 퀵브레드. 겉은 바삭하고 속은 부슬한 질감입니다.",
    tip: "반죽을 너무 치대지 않아야 결이 살아요.",
    aliases: ["scones", "퀵브레드", "quick bread"],
  },
  {
    term: "사워도우",
    english: "sourdough",
    category: "반죽·제품",
    meaning:
      "천연발효종으로 발효시킨 빵. 은은한 신맛과 쫄깃한 식감, 두꺼운 껍질이 특징입니다.",
    aliases: [
      "sourdough",
      "발효종 빵",
      "캄파뉴",
      "country loaf",
      "pain de campagne",
    ],
  },
  {
    term: "포카치아",
    english: "focaccia",
    category: "반죽·제품",
    meaning: "올리브유를 듬뿍 넣어 팬에 납작하게 구운 이탈리아 빵입니다.",
    aliases: ["focaccia", "포카치"],
  },
  {
    term: "치아바타",
    english: "ciabatta",
    category: "반죽·제품",
    meaning:
      "수분이 많은 반죽으로 구워 속에 큰 기공이 있는 이탈리아 빵입니다. 이름은 '슬리퍼'라는 뜻이에요.",
    aliases: ["ciabatta"],
  },
  {
    term: "바게트",
    english: "baguette",
    category: "반죽·제품",
    meaning:
      "밀가루, 물, 소금, 이스트로 만드는 길쭉한 프랑스 빵으로 얇고 바삭한 껍질이 특징입니다.",
    aliases: ["baguette", "프랑스 빵"],
  },
  {
    term: "브리오슈",
    english: "brioche",
    category: "반죽·제품",
    meaning:
      "버터와 달걀을 많이 넣어 부드럽고 풍부한 맛을 내는 프랑스식 반죽입니다.",
    aliases: ["brioche"],
  },
  {
    term: "마카롱",
    english: "macaron",
    category: "반죽·제품",
    meaning:
      "아몬드 가루와 머랭으로 만든 두 장의 코크 사이에 필링을 채운 프랑스 과자입니다.",
    tip: "표면이 마르는 '건조' 과정이 있어야 발(피에)이 올라와요.",
    aliases: [
      "macarons",
      "코크",
      "피에",
      "마카롱 코크",
      "macaronnage",
      "마카로나주",
    ],
  },
  {
    term: "티라미수",
    english: "tiramisu",
    category: "반죽·제품",
    meaning:
      "에스프레소에 적신 사보이아르디(레이디핑거)와 마스카포네 크림을 쌓아 만든 이탈리아 디저트입니다.",
    aliases: ["tiramisù", "레이디핑거", "ladyfinger", "사보이아르디"],
  },

  // 상태·온도
  {
    term: "상온",
    english: "room temperature",
    category: "상태·온도",
    meaning:
      "실내 온도로 보통 20~25℃를 말합니다. 버터·달걀을 미리 꺼내 이 정도로 맞춰 사용해요.",
    aliases: ["실온", "room temp", "room temperature"],
  },
  {
    term: "예열",
    english: "preheat",
    category: "상태·온도",
    meaning: "반죽을 넣기 전에 오븐을 미리 목표 온도로 데워두는 일입니다.",
    tip: "오븐이 설정 온도에 도달한 뒤에도 10분 더 두면 내부가 안정돼요.",
    aliases: ["preheating", "오븐 예열", "예열하기"],
  },
  {
    term: "차가운 버터",
    english: "cold butter",
    category: "상태·온도",
    meaning:
      "냉장고에서 갓 꺼낸 차가운 버터. 스콘·파이처럼 결이 살아 있고 바삭해야 하는 반죽에 씁니다.",
    aliases: ["아이스 버터", "냉장 버터", "cold butter"],
  },
  {
    term: "포마드 상태",
    english: "pomade",
    category: "상태·온도",
    meaning:
      "버터가 손가락으로 쉽게 눌릴 만큼 부드러운 크림 같은 상태(약 18~22℃)를 말합니다.",
    aliases: [
      "포마드",
      "pommade",
      "pomade",
      "부드러운 버터",
      "softened butter",
    ],
  },
  {
    term: "브라운 버터",
    english: "beurre noisette",
    category: "상태·온도",
    meaning:
      "버터를 가열해 유단백이 갈색이 되도록 태워 고소한 견과류 향을 낸 것입니다.",
    aliases: [
      "뵈르 누아제트",
      "beurre noisette",
      "browned butter",
      "buerre noisette",
      "태운 버터",
    ],
  },
  {
    term: "뿔 상태",
    english: "stiff peaks",
    category: "상태·온도",
    meaning:
      "거품의 상태를 뜻하는 말입니다. 휘퍼를 들면 자국만 남는 '묽은 상태', 끝이 구부러지는 '70%(중간 뿔)', 뾰족하게 서는 '100%(단단한 뿔)'로 나눕니다.",
    tip: "생크림은 8부 정도(부드러운 뿔)가 케이크 샌드와 데코에 좋아요.",
    aliases: [
      "휘핑 단계",
      "휘핑 정도",
      "soft peaks",
      "medium peaks",
      "뿔",
      "단단한 뿔",
      "부드러운 뿔",
      "8부",
      "9부",
      "휘핑 상태",
    ],
  },
  {
    term: "리본 상태",
    english: "ribbon stage",
    category: "상태·온도",
    meaning:
      "달걀과 설탕을 충분히 휘핑해 거품기로 떠올렸을 때 리본처럼 접히며 흐르는 상태입니다.",
    aliases: ["ribbon", "리본", "ribbon stage", "공립"],
  },
  {
    term: "윈도우페인",
    english: "windowpane test",
    category: "상태·온도",
    meaning:
      "반죽을 얇게 늘렸을 때 찢어지지 않고 막이 투명하게 비치는 상태로, 글루텐이 충분히 발달했다는 신호입니다.",
    aliases: [
      "글루텐 막",
      "windowpane",
      "윈도우 페인",
      "글루텐 테스트",
      "반죽 막",
    ],
  },
  {
    term: "과발효",
    english: "overproofed",
    category: "상태·온도",
    meaning:
      "발효가 지나쳐 반죽이 주저앉고 신맛이 강해지며 굽기에서 잘 부풀지 않는 상태입니다.",
    aliases: ["overproof", "오버프루핑", "과발효 반죽", "발효 과다"],
  },
  {
    term: "발효 부족",
    english: "underproofed",
    category: "상태·온도",
    meaning:
      "발효가 덜 되어 속이 촘촘하고 빵이 터지거나 부피가 작은 상태입니다.",
    aliases: ["underproof", "언더프루핑", "미발효", "발효 덜됨"],
  },
  {
    term: "오븐 스프링",
    english: "oven spring",
    category: "상태·온도",
    meaning: "빵을 굽기 시작한 초반에 가스가 팽창해 급격히 부푸는 현상입니다.",
    aliases: ["oven spring", "오븐 스프링", "초기 팽창"],
  },
  {
    term: "메일라드 반응",
    english: "Maillard reaction",
    category: "상태·온도",
    meaning:
      "단백질과 당이 열을 받아 갈색으로 변하며 고소한 향이 나는 화학 반응입니다. 빵 껍질의 색과 맛이 여기서 나와요.",
    aliases: ["마이야르", "maillard", "갈변", "갈변 반응", "마이야르 반응"],
  },
  {
    term: "스팀",
    english: "steam",
    category: "상태·온도",
    meaning:
      "빵을 굽는 초반 오븐 안에 수증기를 채우는 일입니다. 껍질이 늦게 굳어 팽창이 잘 되고 윤기가 납니다.",
    aliases: ["스팀 굽기", "steaming", "수증기", "스팀 주입"],
  },
  {
    term: "크럼",
    english: "crumb",
    category: "상태·온도",
    meaning:
      "빵이나 케이크의 속살 조직. 기공의 크기와 모양으로 발효·반죽 상태를 가늠할 수 있습니다.",
    aliases: ["crumb", "속살", "기공", "크럼 구조", "기포"],
  },
  {
    term: "베이커스 퍼센트",
    english: "baker's percentage",
    category: "상태·온도",
    meaning:
      "밀가루 무게를 100%로 두고 다른 재료를 그에 대한 비율로 표시하는 제빵 배합 표기법입니다.",
    tip: "물 비율이 수분율(하이드레이션)입니다.",
    aliases: [
      "베이커스 퍼센트",
      "배합비",
      "baker percentage",
      "bakers percentage",
      "수분율",
      "하이드레이션",
      "hydration",
    ],
  },
];
