const log = require(`./logger`);


const fetcha = async function(url, options, attemts = 5) {
    for (let a = 1; a <= attemts; a++) {
        try {
            return await fetch(url, options);
        } catch (error) {
            if (a >= attemts) {
                throw error;
            };
        };
    };
};

const docpath = function() {
    try {
        let path = (require(`child_process`).execSync(`chcp 65001 & reg query "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders" /v Personal`))
            .toString(`utf-8`)
            .replaceAll(`\r\n`, ``)
            .split(`    `)
            .slice(3)
            .join(`    `);

        const matches = path.match(/%[^%]+%/g);

        if (matches) {
            for (let match of matches) {
                path = path.replace(match, process.env[match.substring(1, match.length - 1)]);
            };
        };

        log.info(`[CODE: INSTALLER_DOCUMENTS_PATH] [PATH: ${path}]`);

        return path;
    } catch (error) {
        log.error(`[CODE: INSTALLER_DOCUMENTS_PATH]`);

        return `${process.env[`USERPROFILE`]}/Documents`;
    };
};


module.exports = {
    fetcha,
    docpath
};