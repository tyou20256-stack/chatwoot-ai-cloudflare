-- Sloten FAQ reclassification migration
-- Total: 143 | delete: 29 | rewrite: 78 | keep: 36

-- =============== DELETE ===============
DELETE FROM faq WHERE id IN (18, 61, 62, 63, 80, 93, 94, 95, 96, 99, 100, 101, 104, 105, 106, 109, 115, 119, 130, 132, 133, 134, 136, 138, 169, 176, 184, 188, 191);

-- =============== REWRITE ===============
UPDATE faq SET question = 'スロ天で入金が反映されません', answer = '以下をご確認ください。①振込名義がアカウント登録名と一致しているか ②入金額が¥10,000以上であるか ③銀行振込の場合、営業時間外は翌営業日の反映になることがあります ④仮想通貨の場合、ネットワーク承認に時間がかかることがございます。解決しない場合は振込明細をご用意の上、スロ天のチャットサポートまでお問い合わせください。', updated_at = CURRENT_TIMESTAMP WHERE id = 9;
UPDATE faq SET question = 'スロ天の出金方法を教えてください', answer = 'スロ天からの出金をご希望の場合は、チャットにてスタッフへご希望をお伝えください。ご登録の口座情報等を確認の上、出金手続きを進めさせていただきます。出金時にはボーナスの賭け条件が完了していることをご確認ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 10;
UPDATE faq SET question = 'スロ天の出金にかかる時間は？', answer = 'スロ天では通常、出金申請後24時間以内にお手続きを完了いたします。銀行側の処理状況やお申し込みのタイミングによっては多少お時間をいただく場合がございます。土日祝日や銀行の営業時間外の場合、翌営業日の対応となることもございます。', updated_at = CURRENT_TIMESTAMP WHERE id = 11;
UPDATE faq SET question = 'スロ天でATM振込で入金する方法を教えてください', answer = 'スロ天のATM振込での入金は、チャットにて「入金」とメッセージをお送りください。スタッフがATM振込用の口座情報をご案内いたします。最寄りのATMから¥10,000〜¥200,000の範囲でお振込みください。振込完了後、確認次第アカウント残高に反映いたします。', updated_at = CURRENT_TIMESTAMP WHERE id = 12;
UPDATE faq SET question = 'スロ天のゾロ目チャレンジとは？', answer = 'スロ天のゾロ目チャレンジは、スロットゲームでボーナス購入を行い、配当金がゾロ目（例:¥1,111、¥22,222など）になった場合に特典がもらえるキャンペーンです。最大30%のキャッシュバックが適用されます。ボーナスコード「ゾロ目チャレンジ」をご利用ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 14;
UPDATE faq SET question = 'スロ天でボーナスコードはどこで入力しますか？', answer = 'スロ天のボーナスコードは、チャットサポートにてスタッフへ直接お伝えください。現在ご利用いただけるコードには「ゾロ目チャレンジ」「ホワイトデー」「WELCOME10」「FREEGIFT」「POINTS500」などがございます。', updated_at = CURRENT_TIMESTAMP WHERE id = 16;
UPDATE faq SET question = 'スロ天のWELCOME10ボーナスコードとは？', answer = 'WELCOME10はスロ天の新規のお客様向け10%割引ボーナスコードです。初回入金時にご利用いただくと、入金額の10%分がボーナスとして付与されます。チャットで「WELCOME10」とお伝えください。', updated_at = CURRENT_TIMESTAMP WHERE id = 17;
UPDATE faq SET question = 'スロ天のホワイトデーキャンペーンとは？', answer = 'スロ天のホワイトデーキャンペーンは季節限定プロモーションです。ボーナスコード「ホワイトデー」をご利用いただくと、VIPティア別に¥500〜¥3,000のキャッシュボーナスが付与されます。期間限定ですのでお早めにご利用ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 19;
UPDATE faq SET question = 'スロ天で現在利用できるボーナスコード一覧', answer = 'スロ天で現在ご利用いただけるボーナスコード:①「ゾロ目チャレンジ」最大30%キャッシュバック ②「ホワイトデー」ティア別¥500〜¥3,000 ③「WELCOME10」新規10%割引 ④「FREEGIFT」先着100名ノベルティ ⑤「POINTS500」500ポイント。有効期限や条件はチャットでご確認ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 20;
UPDATE faq SET question = 'スロ天にログインできません', answer = '以下をご確認ください。①ユーザー名とパスワードが正しいか ②Caps Lockがオンになっていないか ③ブラウザのキャッシュとCookieをクリア ④別のブラウザでお試しください。解決しない場合はパスワードリセットをお試しいただくか、スロ天のチャットサポートまでご連絡ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 23;
UPDATE faq SET question = 'スロ天のパスワードを忘れました', answer = 'ログイン画面の「パスワードをお忘れですか？」リンクからリセットが可能です。ご登録のメールアドレスにリセット用リンクが送信されます。メールが届かない場合は迷惑メールフォルダもご確認ください。解決しない場合はスロ天のチャットサポートまでご連絡ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 24;
UPDATE faq SET question = 'スロ天を退会したい', answer = '退会をご希望の場合はスロ天のチャットサポートまでご連絡ください。退会前にアカウント残高の出金がお済みであることをご確認ください。退会後はアカウント情報やゲーム履歴にアクセスできなくなりますのでご注意ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 25;
UPDATE faq SET question = 'スロ天のアカウントがロックされました', answer = 'スロ天のチャットサポートまでお問い合わせください。パスワードの複数回誤入力やセキュリティ上の理由でロックされる場合がございます。スタッフが状況を確認し、ロック解除の手続きを行います。', updated_at = CURRENT_TIMESTAMP WHERE id = 26;
UPDATE faq SET question = 'スロ天で複数アカウントは作れますか？', answer = 'いいえ、スロ天ではお一人様1アカウントのみとさせていただいております。複数アカウントの作成は利用規約で禁止されており、発覚した場合はすべてのアカウントの停止および残高の没収となる場合がございます。', updated_at = CURRENT_TIMESTAMP WHERE id = 28;
UPDATE faq SET question = 'スロ天でゲームが動かない・フリーズした', answer = '以下をお試しください。①ページを再読み込み（リロード） ②ブラウザのキャッシュをクリア ③別のブラウザでお試しください ④インターネット接続をご確認ください ⑤スマホの場合はアプリを再起動。それでも解決しない場合はスロ天のチャットサポートまでご連絡ください。ゲーム名とエラー状況をお伝えいただけるとスムーズです。', updated_at = CURRENT_TIMESTAMP WHERE id = 34;
UPDATE faq SET question = 'スロ天のゲームのRTP（還元率）はどこで確認できますか？', answer = '各ゲームのRTPは、ゲーム画面内の「i」アイコンやヘルプセクションからご確認いただけます。一般的にスロットゲームのRTPは94〜97%程度です。具体的なゲームのRTPについてはスロ天のチャットサポートでもお答えいたします。', updated_at = CURRENT_TIMESTAMP WHERE id = 38;
UPDATE faq SET question = 'スロ天で銀行メンテナンス中に入金するには？', answer = '銀行メンテナンス時間中はATM振込・銀行振込がご利用いただけない場合がございます。スロ天では仮想通貨・コンビニ払い・PayPayマネー・PayPayマネーライトなど銀行を経由しない入金方法もご用意しております。メンテナンス情報はサイトのお知らせをご確認ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 49;
UPDATE faq SET question = 'スロ天で出金が反映されません', answer = '以下をご確認ください。①ボーナスの賭け条件が達成されているか ②出金申請が正しく送信されたか ③銀行の営業時間外の場合は翌営業日の反映になります。48時間以上経っても反映されない場合は、スロ天のチャットサポートまでお問い合わせください。迅速に調査いたします。', updated_at = CURRENT_TIMESTAMP WHERE id = 51;
UPDATE faq SET question = 'スロ天で入金時に名義が一致しないとエラーになりますか？', answer = 'はい、スロ天への入金時にはご登録名義と送金元の名義が一致している必要がございます。名義不一致で入金された場合はサポートまでご連絡ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 53;
UPDATE faq SET question = 'スロ天で入金額を間違えて振り込んでしまいました', answer = 'スロ天サポートまでご連絡ください。¥10,000〜¥200,000の範囲内であればそのまま反映されます。範囲外の場合は返金対応いたします。', updated_at = CURRENT_TIMESTAMP WHERE id = 54;
UPDATE faq SET question = 'スロ天で二重に入金してしまった場合、返金は可能ですか？', answer = '二重入金の返金は可能です。入金日時・金額・送金方法をスロ天サポートにお伝えください。確認後1〜3営業日で返金処理いたします。', updated_at = CURRENT_TIMESTAMP WHERE id = 55;
UPDATE faq SET question = 'スロ天の出金申請をキャンセルできますか？', answer = 'はい、処理が開始される前であればキャンセル可能です。スロ天のマイページの出金履歴からキャンセルするか、チャットサポートまでご連絡ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 56;
UPDATE faq SET question = 'スロ天でPayPay入金がエラーになります', answer = 'PayPay残高不足、アプリのバージョンが古い、1日の利用上限到達が主な原因です。アプリを更新し残高をご確認ください。解決しない場合はスロ天の他の入金方法（ATM振込、銀行振込、銀行振込(自動)、仮想通貨、コンビニ払い、PayPayマネーライト）もご利用いただけます。', updated_at = CURRENT_TIMESTAMP WHERE id = 58;
UPDATE faq SET question = 'スロ天のコンビニ入金の手順は？', answer = '①入金画面でコンビニ入金を選択→②入金額（¥10,000〜¥200,000）を入力→③表示される払込番号を保存→④コンビニのレジで番号を提示し現金でお支払い→⑤通常5〜15分で残高に反映されます。', updated_at = CURRENT_TIMESTAMP WHERE id = 59;
UPDATE faq SET question = 'スロ天で仮想通貨の送金アドレスを間違えてしまいました', answer = '仮想通貨の誤送金は回収が困難です。速やかにスロ天サポートへトランザクションIDと送金先アドレスをお知らせください。今後はアドレスのコピー&ペーストを推奨します。', updated_at = CURRENT_TIMESTAMP WHERE id = 60;
UPDATE faq SET question = 'スロ天ドリームポットの仕組みを教えてください', answer = '対象スロットをプレイするとベット額の一部がプールに加算されます。当選はランダムで、ジャックポットは最大¥5,000,000まで増加します。ベット額が大きいほど当選確率が上がります。', updated_at = CURRENT_TIMESTAMP WHERE id = 64;
UPDATE faq SET question = 'スロ天でデモプレイ（無料プレイ）はできますか？', answer = 'はい、スロ天では多くのスロットでデモプレイが可能です。ゲームロビーで「デモ」ボタンをクリックしてください。ライブカジノ等一部ゲームは非対応です。', updated_at = CURRENT_TIMESTAMP WHERE id = 65;
UPDATE faq SET question = 'スロ天のライブカジノではどんなゲームが遊べますか？', answer = 'スロ天ではバカラ、ブラックジャック、ルーレット、ゲームショー（Crazy Time等）をリアルディーラーと24時間プレイいただけます。Evolution等の大手プロバイダーが提供しています。', updated_at = CURRENT_TIMESTAMP WHERE id = 66;
UPDATE faq SET question = 'スロ天のフリースピンボーナスの使い方は？', answer = '対象スロットを開くと自動的にフリースピンが利用可能です。フリースピンから得た勝利金には賭け条件が適用されます。有効期限は通常7日間です。', updated_at = CURRENT_TIMESTAMP WHERE id = 67;
UPDATE faq SET question = 'スロ天にロイヤリティプログラム（VIP）はありますか？', answer = 'はい、スロ天にはbronze / silver / gold / platinumの4段階VIPプログラムがございます。プレイするたびにポイントが貯まりVIPレベルが上がり、専用ボーナス、キャッシュバック率向上、出金限度額引き上げ等の特典をご利用いただけます。', updated_at = CURRENT_TIMESTAMP WHERE id = 68;
UPDATE faq SET question = 'スロ天でボーナスを放棄（キャンセル）できますか？', answer = 'はい、スロ天のマイページのボーナス管理から放棄可能です。ただし放棄するとボーナス残高と勝利金も失効します。出金をお急ぎの場合にご検討ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 69;
UPDATE faq SET question = 'スロ天の推奨ブラウザやデバイスは？', answer = 'Chrome、Safari、Firefox、Edgeの最新版を推奨します。スマホ・タブレットでもご利用可能で、専用アプリは不要です。', updated_at = CURRENT_TIMESTAMP WHERE id = 70;
UPDATE faq SET question = 'スロ天で画面が真っ白になりました', answer = 'ブラウザのキャッシュクリア、ページの再読み込み、別のブラウザでお試しください。それでも解決しない場合はスロ天のチャットサポートまでご連絡ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 71;
UPDATE faq SET question = 'スロ天で通信エラーが表示されます', answer = 'インターネット接続をご確認ください。Wi-Fiの再接続やモバイルデータ通信への切替をお試しください。スロ天ではVPN利用は禁止されていますので、VPN使用中の場合はOFFにしてお試しください。', updated_at = CURRENT_TIMESTAMP WHERE id = 72;
UPDATE faq SET question = 'スロ天での個人情報はどのように保護されていますか？', answer = 'スロ天ではSSL暗号化通信でデータを保護しています。個人情報は厳格なプライバシーポリシーに基づき管理され、第三者への不正な提供は一切行いません。', updated_at = CURRENT_TIMESTAMP WHERE id = 73;
UPDATE faq SET question = 'スロ天のアカウントに不正アクセスされたかもしれません', answer = '速やかにパスワードを変更し、スロ天のチャットサポート（24時間対応）までご連絡ください。身に覚えのないログインや取引がないか確認いたします。', updated_at = CURRENT_TIMESTAMP WHERE id = 74;
UPDATE faq SET question = 'スロ天のメンテナンス中はどうなりますか？', answer = 'メンテナンス中はスロ天のサイトの一部または全機能がご利用いただけません。メンテナンス情報はサイト上のお知らせで事前にご案内いたします。', updated_at = CURRENT_TIMESTAMP WHERE id = 78;
UPDATE faq SET question = 'スロ天のポーカーはどのような形式で遊べますか？', answer = 'スロ天ではビデオポーカー（ソロ形式）、ライブカジノポーカー（ディーラー対戦）、テーブルポーカー（コンピュータ対戦）の3形式をお楽しみいただけます。', updated_at = CURRENT_TIMESTAMP WHERE id = 79;
UPDATE faq SET question = 'スロ天のハワイアンドリームの特徴は？', answer = 'JTG社のハワイテーマスロットです。3x3リールのシンプルな構成ながら、リスピン連鎖で大きな配当を狙えます。パチスロ風の演出が楽しめ、スロ天でも人気のタイトルです。', updated_at = CURRENT_TIMESTAMP WHERE id = 81;
UPDATE faq SET question = 'スロ天のサイト言語は変更できますか？', answer = 'はい、スロ天ではサイト右上の言語設定から変更可能です。現在は日本語と英語に対応しております。', updated_at = CURRENT_TIMESTAMP WHERE id = 83;
UPDATE faq SET question = 'スロ天でゲーム中に接続が切れた場合はどうなりますか？', answer = 'ゲーム進行中に接続が切れた場合、再接続後にゲームは中断した時点から再開されます。ベットは有効のまま保持されますのでご安心ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 84;
UPDATE faq SET question = 'スロ天でモバイルの動作が遅い場合の対処法は？', answer = 'ブラウザのキャッシュクリア、不要なタブを閉じる、Wi-Fi接続の確認をお試しください。また最新OSとブラウザへの更新を推奨します。解決しない場合はスロ天サポートまでご連絡ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 85;
UPDATE faq SET question = 'スロ天で賭け条件の進捗はどこで確認できますか？', answer = 'スロ天のマイページの「ボーナス管理」セクションから、各ボーナスの賭け条件の達成率をリアルタイムでご確認いただけます。', updated_at = CURRENT_TIMESTAMP WHERE id = 86;
UPDATE faq SET question = 'スロ天のキャッシュバックボーナスとは？', answer = 'プレイで発生した損失の一部がキャッシュバックとして返金される制度です。スロ天ではVIPレベル（bronze / silver / gold / platinum）によりキャッシュバック率が異なります。ゾロ目チャレンジでは最大30%のキャッシュバックが適用されます。', updated_at = CURRENT_TIMESTAMP WHERE id = 87;
UPDATE faq SET question = 'スロ天のゲームの勝率や確率は操作されていませんか？', answer = 'スロ天では一切操作しておりません。全ゲームは独立した乱数生成器（RNG）で結果が決定され、第三者機関により公正性が検証されています。スロ天はジョージア政府ライセンス（N138/1）のもとで運営されています。', updated_at = CURRENT_TIMESTAMP WHERE id = 88;
UPDATE faq SET question = 'スロ天の利用規約はどこで確認できますか？', answer = 'スロ天のサイトフッターの「一般規約」リンクからご確認いただけます。プロモーション規約、プライバシーポリシー、AML/KYCポリシーもフッターからアクセス可能です。', updated_at = CURRENT_TIMESTAMP WHERE id = 91;
UPDATE faq SET question = 'スロ天のお友達紹介プログラムの詳細は？', answer = 'スロ天のお友達紹介では、紹介したお友達のベット額に対してコミッションが支払われます。コミッション率:スロット0.40%、ライブカジノ0.20%、パチンコ0.20%、ポーカー0.00%。毎日23:59締め、翌日18:00より順次お支払いです。', updated_at = CURRENT_TIMESTAMP WHERE id = 117;
UPDATE faq SET question = 'スロ天のPlay''n GO 熱春祭りトーナメントとは？', answer = 'スロ天で開催中のPlay''n GO主催の期間限定トーナメントです。最大計200フリースピンを獲得できます。対象ゲームや参加条件の詳細はトップページのバナーまたはプロモーションページをご確認ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 120;
UPDATE faq SET question = 'スロ天のお友達紹介コミッションの支払いタイミングは？', answer = 'スロ天のお友達紹介コミッションは毎日23:59が締めで、翌日18:00より順次お支払いいたします。', updated_at = CURRENT_TIMESTAMP WHERE id = 121;
UPDATE faq SET question = 'スロ天で入金時にサポート確認が必要と表示されました', answer = 'スロ天の一部入金方法ではセキュリティのためサポートへの事前連絡が必要です。手順:①入金ページで金額と方法を選択→②「カスタマーサポートへ連絡」ボタンをクリック→③チャットに「入金」とだけ入力して送信→④サポートの確認を待つ→⑤確認後に入金手続きを続行。※「入金」以外の文言は入力しないでください。', updated_at = CURRENT_TIMESTAMP WHERE id = 125;
UPDATE faq SET question = 'スロ天でPayPayマネーとPayPayマネーライトの違いは？', answer = 'PayPayマネーは本人確認済みの残高で出金も可能です。PayPayマネーライトは本人確認不要ですが出金はできません。スロ天ではどちらも入金にご利用いただけます。詳細はPayPayアプリでご確認ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 126;
UPDATE faq SET question = 'スロ天のポイントシステムの仕組みは？', answer = 'スロ天では入金時にポイントが付与されます（例:¥10,000入金で10,000ポイント）。ポイントはボーナスやフリースピンと交換可能です。詳細な交換レートはマイアカウントページでご確認ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 135;
UPDATE faq SET question = 'スロ天ドリームポットの当選ルールは？', answer = 'スロ天ドリームポットは日本の宝くじ「ロト」と同じ方式で番号が抽選されます。ロトで発表される6桁の番号とあなたの番号が一致すると当選です。¥50,000分ベットするとチケットを1枚獲得でき、ジャックポットは最大¥5,000,000です。過去の抽選履歴はロトページからご確認いただけます。', updated_at = CURRENT_TIMESTAMP WHERE id = 137;
UPDATE faq SET question = 'スロ天ドリームポットのチケットはどこで確認できますか？', answer = 'スロ天ドリームポットのチケットはロトページの「マイチケット」セクションでご確認いただけます。本日の獲得チケット数と総獲得チケット数が表示されます。¥50,000分ベットするごとに自動で1枚獲得され、最大¥5,000,000のジャックポットを目指せます。', updated_at = CURRENT_TIMESTAMP WHERE id = 139;
UPDATE faq SET question = 'スロ天のライブルーレットの種類は？', answer = 'ルーレットは主に3種類あります。ヨーロピアン（0が1つ・ハウスエッジ2.7%）、アメリカン（0と00・ハウスエッジ5.26%）、フレンチ（0が1つ+特殊ルール・最も有利）。スロ天ではライトニングルーレットもご提供しており、最大500倍のマルチプライヤー配当をお楽しみいただけます。', updated_at = CURRENT_TIMESTAMP WHERE id = 152;
UPDATE faq SET question = 'スロ天でフリースピン中に接続が切れたら？', answer = 'フリースピンの進行状況はサーバー側で保存されています。再接続後に同じゲームを開くと中断地点から再開でき、残りスピンや獲得配当は失われません。', updated_at = CURRENT_TIMESTAMP WHERE id = 170;
UPDATE faq SET question = 'スロ天のライブカジノで映像が止まったら？', answer = 'ベットはサーバーで処理済みですので、回線復旧後にゲーム結果が反映されます。スロ天のベット履歴から結果もご確認いただけます。映像遅延が頻発する場合はWi-Fi接続や画質設定の変更をお試しください。', updated_at = CURRENT_TIMESTAMP WHERE id = 171;
UPDATE faq SET question = 'スロ天でスロット初心者におすすめのゲームは？', answer = 'Moon PrincessやSweet Bonanza 1000がおすすめです。ルールがシンプルで連鎖の爽快感があります。スロ天のデモプレイで無料体験してからお楽しみください。', updated_at = CURRENT_TIMESTAMP WHERE id = 172;
UPDATE faq SET question = 'スロ天でボラティリティ別のおすすめスロットは？', answer = '低ボラ（安定型）:Mahjong Ways 2。中ボラ（バランス型）:花魁ドリーム。高ボラ（一撃狙い）:Gates of Olympus 1000。超高ボラ（爆発力）:Sweet Bonanza 1000。予算と好みでお選びください。', updated_at = CURRENT_TIMESTAMP WHERE id = 173;
UPDATE faq SET question = 'スロ天でのおすすめベット額は？', answer = '予算の1〜2%を1スピンの目安にするのがおすすめです。例えば予算¥10,000なら1スピン¥100〜200程度。高ボラスロットはフリースピンまで耐える資金が必要ですので、低ベットで長く遊ぶのが基本です。', updated_at = CURRENT_TIMESTAMP WHERE id = 174;
UPDATE faq SET question = 'スロ天でボーナスBUYは使うべき？', answer = 'ベット額の60〜100倍で即座にフリースピンに突入できる機能で、スロ天の多くのスロットに搭載されています。時間効率は良いですが、購入費用に対してリターンは保証されません。予算に余裕がある場合にご活用ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 175;
UPDATE faq SET question = 'スロ天のアカウント登録に必要なものは？', answer = 'メールアドレス、氏名、生年月日、住所、電話番号が必要です。スロ天は20歳以上の方のみご利用いただけます。初回出金前にKYCとして身分証明書と3ヶ月以内発行の住所証明書の提出が必要です。', updated_at = CURRENT_TIMESTAMP WHERE id = 177;
UPDATE faq SET question = 'スロ天で複数アカウントを作成できますか？', answer = 'スロ天ではお一人様1アカウントのみとさせていただいております。複数アカウントは利用規約で禁止されており、発覚した場合は全アカウントの凍結・残高没収・永久追放の対象となります。', updated_at = CURRENT_TIMESTAMP WHERE id = 178;
UPDATE faq SET question = 'スロ天のKYC（本人確認）の手順は？', answer = 'アカウント設定→本人確認より、①顔写真付き身分証明書 ②3ヶ月以内の住所証明書 をアップロードください。審査は通常24〜72時間以内に完了します。スロ天では初回出金前にKYCの完了が必要です。', updated_at = CURRENT_TIMESTAMP WHERE id = 179;
UPDATE faq SET question = 'スロ天でアカウントが凍結される理由は？', answer = '複数アカウント、不正行為、KYC未提出、虚偽登録、禁止地域からのアクセス、マネロンの疑い、規約違反が主な理由です。凍結された場合はスロ天サポートまでご連絡ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 180;
UPDATE faq SET question = 'スロ天で自己排除（セルフエクスクルージョン）を設定するには？', answer = 'スロ天の責任あるギャンブル設定から24時間〜永久までの期間を選択できます。期間中はログイン・入金・プレイができません。途中解除はできません。サポートでも設定可能です。', updated_at = CURRENT_TIMESTAMP WHERE id = 181;
UPDATE faq SET question = 'スロ天で入金制限を設定する方法は？', answer = 'スロ天の責任あるギャンブル設定から、日次・週次・月次の入金上限を設定いただけます。引き下げは即時反映、引き上げは24時間のクーリングオフ後に反映されます。サポートからも設定可能です。', updated_at = CURRENT_TIMESTAMP WHERE id = 182;
UPDATE faq SET question = 'スロ天のアカウント削除方法は？', answer = 'スロ天のチャットサポート（24時間対応）までアカウント閉鎖をご依頼ください。閉鎖前に残高の出金をお済ませください。閉鎖後は残高・ボーナス・VIPステータスはすべて失われます。', updated_at = CURRENT_TIMESTAMP WHERE id = 183;
UPDATE faq SET question = 'スロ天の賭け条件のゲーム別消化率は？', answer = 'スロット100%、ルーレット20〜50%、ブラックジャック10〜20%、ライブカジノ10%が一般的な消化率です。除外ゲームもございますので、各ボーナスの詳細をご確認ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 186;
UPDATE faq SET question = 'スロ天のボーナスの有効期限は？', answer = 'スロ天のボーナスは通常7〜30日間が有効期限です。期限内に賭け条件を達成できなかった場合、ボーナス残高および関連する賞金は自動的に失効します。各プロモーションページで正確な期限をご確認ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 187;
UPDATE faq SET question = 'スロ天でボーナスから除外されるゲームは？', answer = 'ジャックポットスロット、一部の高RTPスロット、特定のテーブルゲームが除外対象となる場合がございます。除外ゲームでのプレイは賭け条件に反映されず、ボーナス没収の対象となることがあります。各プロモーション詳細をご確認ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 189;
UPDATE faq SET question = 'スロ天でボーナスが没収される条件は？', answer = '有効期限切れ、最大ベット違反、除外ゲームのプレイ、不正行為、条件未達での出金申請、複数アカウント使用、規約違反が対象です。没収されたボーナスは復元できません。ご不明点はスロ天サポートまで。', updated_at = CURRENT_TIMESTAMP WHERE id = 190;
UPDATE faq SET question = 'スロ天のフリースピンの利用条件は？', answer = 'スロ天のフリースピンは指定スロットでのみ使用可能です。賞金には賭け条件が適用され、有効期限は付与から通常7日間です。詳細は各プロモーション規約をご確認ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 192;
UPDATE faq SET question = 'スロ天のキャッシュバックはどのように計算されますか？', answer = 'スロ天では対象期間中の純損失額に基づきキャッシュバックを計算します。VIPランク（bronze / silver / gold / platinum）により還元率が異なります。ゾロ目チャレンジでは最大30%のキャッシュバックが適用されます。', updated_at = CURRENT_TIMESTAMP WHERE id = 193;
UPDATE faq SET question = 'スロ天ではボーナスの併用は可能ですか？', answer = 'スロ天では原則として複数ボーナスの同時利用はできません。新しいボーナスを受け取る前に、現在のボーナス条件を完了するか放棄する必要があります。詳細は各プロモーション規約をご確認ください。', updated_at = CURRENT_TIMESTAMP WHERE id = 194;
UPDATE faq SET question = 'スロ天で出金が拒否される理由は？', answer = '主な理由はKYC未完了、賭け条件未達、入金と異なる出金方法、不正の疑い、最低出金額未満、入金額1倍のプレイスルー未達成です。詳細はスロ天のチャットサポート（24時間対応）までお問い合わせください。', updated_at = CURRENT_TIMESTAMP WHERE id = 195;
UPDATE faq SET question = 'スロ天で禁止されている行為は？', answer = 'スロ天ではボット自動プレイ、ボーナス乱用、共謀プレイ、マネーロンダリング、システム脆弱性の悪用、VPN利用を禁止しております。違反が確認された場合、アカウント凍結・残高没収の対象となります。', updated_at = CURRENT_TIMESTAMP WHERE id = 196;
UPDATE faq SET question = 'スロ天で規約違反した場合のペナルティは？', answer = 'スロ天では違反程度に応じて警告→ボーナス没収→賞金無効→一時停止→永久凍結→残高没収の段階で対応します。重大な違反はジョージア規制当局（ライセンスN138/1）へ報告する場合がございます。運営判断が最終となります。', updated_at = CURRENT_TIMESTAMP WHERE id = 197;

-- =============== KEEP (no-op, listed for review) ===============
-- ids: 75, 76, 77, 90, 122, 123, 127, 128, 129, 131, 140, 141, 142, 144, 145, 146, 147, 148, 149, 150, 151, 154, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 185
