function TTBoteam (opts, ttbotinsts) {

}

module.exports = TTBoteam;

    //  default settings for all

let ttBotsTeam = new TTBoteam({
    lowdb: global.$lowdb,
    admins: penv.TBOT_AMDS,
    noptions: { polling: true }
})

ttBotsTeam.setup({
    mainBot: new TelegramBot({ token: penv.TBOT_TOKEN }),
    mainBot: new TelegramBot({ token: penv.TBOT_TOKEN }),
    mainBot: new TelegramBot({ token: penv.TBOT_TOKEN })
})

ttBotsTeam.learn()