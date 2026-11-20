export interface UpazilaItem {
  id: string;
  en: string;
  bn: string;
}

export interface DistrictItem {
  id: string;
  en: string;
  bn: string;
  upazilas: UpazilaItem[];
}

export interface DivisionItem {
  id: string;
  en: string;
  bn: string;
  districts: DistrictItem[];
}

export const BD_DIVISIONS: DivisionItem[] = [
  {
    id: 'dhaka',
    en: 'Dhaka',
    bn: 'ঢাকা',
    districts: [
      {
        id: 'kishoreganj',
        en: 'Kishoreganj',
        bn: 'কিশোরগঞ্জ',
        upazilas: [
          { id: 'kishoreganj-sadar', en: 'Kishoreganj Sadar', bn: 'কিশোরগঞ্জ সদর' },
          { id: 'bhairab', en: 'Bhairab', bn: 'ভৈরব' },
          { id: 'bajitpur', en: 'Bajitpur', bn: 'বাজিতপুর' },
          { id: 'karimganj', en: 'Karimganj', bn: 'করিমগঞ্জ' },
          { id: 'katiadi', en: 'Katiadi', bn: 'কটিয়াদী' },
          { id: 'pakundia', en: 'Pakundia', bn: 'পাকুন্দিয়া' },
          { id: 'hossainpur', en: 'Hossainpur', bn: 'হোসেনপুর' },
        ],
      },
      {
        id: 'dhaka',
        en: 'Dhaka',
        bn: 'ঢাকা',
        upazilas: [
          { id: 'dhanmondi', en: 'Dhanmondi', bn: 'ধানমন্ডি' },
          { id: 'gulshan', en: 'Gulshan', bn: 'গুলশান' },
          { id: 'mirpur', en: 'Mirpur', bn: 'মিরপুর' },
          { id: 'uttara', en: 'Uttara', bn: 'উত্তরা' },
          { id: 'mohammadpur', en: 'Mohammadpur', bn: 'মোহাম্মদপুর' },
          { id: 'banani', en: 'Banani', bn: 'বনানী' },
          { id: 'motijheel', en: 'Motijheel', bn: 'মতিঝিল' },
          { id: 'savar', en: 'Savar', bn: 'সাভার' },
        ],
      },
      {
        id: 'gazipur',
        en: 'Gazipur',
        bn: 'গাজীপুর',
        upazilas: [
          { id: 'gazipur-sadar', en: 'Gazipur Sadar', bn: 'গাজীপুর সদর' },
          { id: 'tongi', en: 'Tongi', bn: 'টঙ্গী' },
          { id: 'kaliakair', en: 'Kaliakair', bn: 'কালিয়াকৈর' },
        ],
      },
      {
        id: 'narayanganj',
        en: 'Narayanganj',
        bn: 'নারায়ণগঞ্জ',
        upazilas: [
          { id: 'narayanganj-sadar', en: 'Narayanganj Sadar', bn: 'নারায়ণগঞ্জ সদর' },
          { id: 'siddhirganj', en: 'Siddhirganj', bn: 'সিদ্ধিরগঞ্জ' },
          { id: 'rupganj', en: 'Rupganj', bn: 'রূপগঞ্জ' },
        ],
      },
    ],
  },
  {
    id: 'chattogram',
    en: 'Chattogram',
    bn: 'চট্টগ্রাম',
    districts: [
      {
        id: 'chattogram',
        en: 'Chattogram',
        bn: 'চট্টগ্রাম',
        upazilas: [
          { id: 'kotwali-ctg', en: 'Kotwali', bn: 'কোতোয়ালী' },
          { id: 'panchlaish', en: 'Panchlaish', bn: 'পাঁচলাইশ' },
          { id: 'agrabad', en: 'Agrabad / Double Mooring', bn: 'আগ্রাবাদ / ডবলমুরিং' },
          { id: 'halishahar', en: 'Halishahar', bn: 'হালিশহর' },
        ],
      },
      {
        id: 'cumilla',
        en: 'Cumilla',
        bn: 'কুমিল্লা',
        upazilas: [
          { id: 'cumilla-sadar', en: 'Cumilla Adarsha Sadar', bn: 'কুমিল্লা আদর্শ সদর' },
          { id: 'daudkandi', en: 'Daudkandi', bn: 'দাউদকান্দি' },
        ],
      },
    ],
  },
  {
    id: 'sylhet',
    en: 'Sylhet',
    bn: 'সিলেট',
    districts: [
      {
        id: 'sylhet',
        en: 'Sylhet',
        bn: 'সিলেট',
        upazilas: [
          { id: 'sylhet-sadar', en: 'Sylhet Sadar', bn: 'সিলেট সদর' },
          { id: 'beanibazar', en: 'Beanibazar', bn: 'বিয়ানীবাজার' },
        ],
      },
      {
        id: 'moulvibazar',
        en: 'Moulvibazar',
        bn: 'মৌলভীবাজার',
        upazilas: [
          { id: 'sreemangal', en: 'Sreemangal', bn: 'শ্রীমঙ্গল' },
          { id: 'moulvibazar-sadar', en: 'Moulvibazar Sadar', bn: 'মৌলভীবাজার সদর' },
        ],
      },
    ],
  },
  {
    id: 'mymensingh',
    en: 'Mymensingh',
    bn: 'ময়মনসিংহ',
    districts: [
      {
        id: 'mymensingh',
        en: 'Mymensingh',
        bn: 'ময়মনসিংহ',
        upazilas: [
          { id: 'mymensingh-sadar', en: 'Mymensingh Sadar', bn: 'ময়মনসিংহ সদর' },
          { id: 'trishal', en: 'Trishal', bn: 'ত্রিশাল' },
          { id: 'bhaluka', en: 'Bhaluka', bn: 'ভালুকা' },
        ],
      },
      {
        id: 'netrokona',
        en: 'Netrokona',
        bn: 'নেত্রকোণা',
        upazilas: [
          { id: 'netrokona-sadar', en: 'Netrokona Sadar', bn: 'নেত্রকোণা সদর' },
          { id: 'kendua', en: 'Kendua', bn: 'কেন্দুয়া' },
        ],
      },
    ],
  },
  {
    id: 'rajshahi',
    en: 'Rajshahi',
    bn: 'রাজশাহী',
    districts: [
      {
        id: 'rajshahi',
        en: 'Rajshahi',
        bn: 'রাজশাহী',
        upazilas: [
          { id: 'boalia', en: 'Boalia', bn: 'বোয়ালিয়া' },
          { id: 'motihar', en: 'Motihar', bn: 'মতিহার' },
        ],
      },
      {
        id: 'bogura',
        en: 'Bogura',
        bn: 'বগুড়া',
        upazilas: [
          { id: 'bogura-sadar', en: 'Bogura Sadar', bn: 'বগুড়া সদর' },
          { id: 'sherpur-bogura', en: 'Sherpur', bn: 'শেরপুর' },
        ],
      },
    ],
  },
  {
    id: 'khulna',
    en: 'Khulna',
    bn: 'খুলনা',
    districts: [
      {
        id: 'khulna',
        en: 'Khulna',
        bn: 'খুলনা',
        upazilas: [
          { id: 'khulna-sadar', en: 'Khulna Sadar', bn: 'খুলনা সদর' },
          { id: 'sonadanga', en: 'Sonadanga', bn: 'সোনাডাঙ্গা' },
        ],
      },
      {
        id: 'jashore',
        en: 'Jashore',
        bn: 'যশোর',
        upazilas: [
          { id: 'jashore-sadar', en: 'Jashore Sadar', bn: 'যশোর সদর' },
        ],
      },
    ],
  },
  {
    id: 'barishal',
    en: 'Barishal',
    bn: 'বরিশাল',
    districts: [
      {
        id: 'barishal',
        en: 'Barishal',
        bn: 'বরিশাল',
        upazilas: [
          { id: 'barishal-sadar', en: 'Barishal Sadar', bn: 'বরিশাল সদর' },
        ],
      },
    ],
  },
  {
    id: 'rangpur',
    en: 'Rangpur',
    bn: 'রংপুর',
    districts: [
      {
        id: 'rangpur',
        en: 'Rangpur',
        bn: 'রংপুর',
        upazilas: [
          { id: 'rangpur-sadar', en: 'Rangpur Sadar', bn: 'রংপুর সদর' },
        ],
      },
    ],
  },
];
