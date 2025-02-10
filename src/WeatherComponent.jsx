import { useState, useEffect } from 'react';

// 地域のエリアコード（北海道・東京・大阪・福岡）
const AREA_CODES = {
  北海道: '016000',
  東京: '130000',
  大阪: '270000',
  福岡: '400000',
};

//APIエンドポイントを生成
const generateApiEndpoint = (areaCode) =>
  `https://www.jma.go.jp/bosai/forecast/data/forecast/${areaCode}.json`;

//天気データ取得
const fetchWeatherData = async (areaCode) => {
  const API_ENDPOINT = generateApiEndpoint(areaCode);

  try {
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) throw new Error('APIリクエストが失敗しました');

    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
};

//天気テキスト変換
const getWeatherText = (weatherText) => {
  if (!weatherText || typeof weatherText !== 'string') return '不明';
  if (weatherText.includes('晴')) return '晴れ';
  if (weatherText.includes('雨')) return '雨';
  if (weatherText.includes('曇')) return '曇り';
  return weatherText;
};

//日付フォーマット変換（「日」のみ表示）
const formatDate = (dateString) => {
  if (!dateString) return '不明';
  const date = new Date(dateString);
  return `${date.getDate()}日`;
};

// 今日の天気を抽出
const extractTodayWeather = (data) => {
  if (!data || data.length === 0) return null;

  try {
    const rawDate = data[0]?.reportDatetime.split('T')[0];
    const weatherText = data[0]?.timeSeries[0]?.areas[0]?.weathers[0] || '不明';

    return {
      date: formatDate(rawDate),
      weather: getWeatherText(weatherText),
      temperature: data[1]?.timeSeries[2]?.areas[0]?.temps[1]
        ? `${data[1].timeSeries[2].areas[0].temps[1]}℃`
        : '不明',
      precipitation: data[0]?.timeSeries[1]?.areas[0]?.pops[0]
        ? `${data[0].timeSeries[1]?.areas[0]?.pops[0]}%`
        : '不明',
    };
  } catch (error) {
    console.error('データの解析に失敗:', error);
    return null;
  }
};

// 3日間の天気を正しく解析する
const extractThreeDayWeather = (data) => {
  if (!data || data.length < 1) return null;

  try {
    const threeDayData = data[0]; // 3日間の天気は `data[0]`
    if (!threeDayData || !threeDayData.timeSeries) return null;

    const days = threeDayData.timeSeries[0]?.timeDefines || [];
    const weathers = threeDayData.timeSeries[0]?.areas[0]?.weathers || [];
    const maxTemps = threeDayData.timeSeries[1]?.areas[0]?.temps || [];
    const minTemps = threeDayData.timeSeries[2]?.areas[0]?.temps || [];

    return days.slice(0, 3).map((date, index) => ({
      date: formatDate(date.split('T')[0]),
      weather: weathers[index] ? getWeatherText(weathers[index]) : '不明',
      maxTemp: maxTemps[index] ? `${maxTemps[index]}℃` : '不明',
      minTemp: minTemps[index] ? `${minTemps[index]}℃` : '不明',
    }));
  } catch (error) {
    console.error('3日間の天気の解析に失敗:', error);
    return null;
  }
};

// WeatherComponent 本体
const WeatherComponent = () => {
  const [selectedArea, setSelectedArea] = useState('東京');
  const [weatherData, setWeatherData] = useState(null);
  const [threeDayWeather, setThreeDayWeather] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('today');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const data = await fetchWeatherData(AREA_CODES[selectedArea]);

      if (data) {
        const todayWeather = extractTodayWeather(data);
        const threeDayWeatherData = extractThreeDayWeather(data);

        if (todayWeather) setWeatherData(todayWeather);
        if (threeDayWeatherData) setThreeDayWeather(threeDayWeatherData);

        if (!todayWeather && !threeDayWeatherData) setError('データの解析に失敗しました');
      } else {
        setError('天気データを取得できませんでした');
      }

      setIsLoading(false);
    };

    fetchData();
  }, [selectedArea]);

  return (
    <div>
      <h1 id='ttl'>{selectedArea} の天気</h1>

      {/* 地域選択ボタン */}
      <div>
        {Object.keys(AREA_CODES).map((area) => (
          <button
            key={area}
            onClick={() => setSelectedArea(area)}
            style={{ fontWeight: area === selectedArea ? 'bold' : 'normal' }}
          >
            {area}
          </button>
        ))}
      </div>

      {/* 切り替えボタン */}
      <div>
        <button onClick={() => setViewMode('today')}>今日の天気</button>
        <button onClick={() => setViewMode('three-day')}>3日間の天気</button>
      </div>

      {isLoading ? (
        <p>読み込み中...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>エラー: {error}</p>
      ) : viewMode === 'today' && weatherData ? (
        <div>
          <h2>{weatherData.date} の天気</h2>
          <p>天気: {weatherData.weather}</p>
          <p>気温: {weatherData.temperature}</p>
          <p>降水確率: {weatherData.precipitation}</p>
        </div>
      ) : viewMode === 'three-day' && threeDayWeather ? (
        <div>
          <h2>3日間の天気予報</h2>
          <table border="1">
            <thead>
              <tr>
                <th> </th>
                {threeDayWeather.map((day, index) => <th key={index}>{day.date}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>天気</td>
                {threeDayWeather.map((day, index) => <td key={index}>{day.weather}</td>)}
              </tr>
              <tr>
                <td>最高気温</td>
                {threeDayWeather.map((day, index) => <td key={index}>{day.maxTemp}</td>)}
              </tr>
              <tr>
                <td>最低気温</td>
                {threeDayWeather.map((day, index) => <td key={index}>{day.minTemp}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p>データがありません</p>
      )}
    </div>
  );
};

export default WeatherComponent;
