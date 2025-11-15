const parser = require(`binary-parser`).Parser;


const drt20 = function(buffer) {
    try {
        const parsed = new parser()
            .floatle(`game_total_time`)
            .floatle(`stage_current_time`)
            .floatle(`stage_current_distance`)
            .floatle(`stage_progress`)
            .floatle(`vehicle_position_x`)
            .floatle(`vehicle_position_y`)
            .floatle(`vehicle_position_z`)
            .floatle(`vehicle_speed`)
            .floatle(`vehicle_velocity_x`)
            .floatle(`vehicle_velocity_y`)
            .floatle(`vehicle_velocity_z`)
            .floatle(`vehicle_left_direction_x`)
            .floatle(`vehicle_left_direction_y`)
            .floatle(`vehicle_left_direction_z`)
            .floatle(`vehicle_forward_direction_x`)
            .floatle(`vehicle_forward_direction_y`)
            .floatle(`vehicle_forward_direction_z`)
            .floatle(`vehicle_suspension_position_rl`)
            .floatle(`vehicle_suspension_position_rr`)
            .floatle(`vehicle_suspension_position_fl`)
            .floatle(`vehicle_suspension_position_fl`)
            .floatle(`vehicle_suspension_velocity_rl`)
            .floatle(`vehicle_suspension_velocity_rr`)
            .floatle(`vehicle_suspension_velocity_fl`)
            .floatle(`vehicle_suspension_velocity_fr`)
            .floatle(`vehicle_cp_forward_speed_rl`)
            .floatle(`vehicle_cp_forward_speed_rr`)
            .floatle(`vehicle_cp_forward_speed_fl`)
            .floatle(`vehicle_cp_forward_speed_fr`)
            .floatle(`vehicle_throttle`)
            .floatle(`vehicle_steering`)
            .floatle(`vehicle_brake`)
            .floatle(`vehicle_clutch`)
            .floatle(`vehicle_gear_index`)
            .floatle(`vehicle_g_lat`)
            .floatle(`vehicle_g_lon`)
            .floatle(`lap_current`)
            .floatle(`vehicle_engine_rpm_current`)
            .floatle(`NA_native_sli_support`)
            .floatle(`lap_position`)
            .floatle(`NA_kers_level`)
            .floatle(`NA_kers_level_max`)
            .floatle(`NA_drs`)
            .floatle(`NA_traction_control`)
            .floatle(`NA_abs`)
            .floatle(`NA_fuel_in_tank`)
            .floatle(`NA_fuel_capacity`)
            .floatle(`NA_in_pits`)
            .floatle(`lap_sector`)
            .floatle(`lap_sector_time_1`)
            .floatle(`lap_sector_time_2`)
            .floatle(`vehicle_brake_temperature_rl`)
            .floatle(`vehicle_brake_temperature_rr`)
            .floatle(`vehicle_brake_temperature_fl`)
            .floatle(`vehicle_brake_temperature_fr`)
            .floatle(`vehicle_tyre_pressure_rl`)
            .floatle(`vehicle_tyre_pressure_rr`)
            .floatle(`vehicle_tyre_pressure_fl`)
            .floatle(`vehicle_tyre_pressure_fr`)
            .floatle(`lap_completed`)
            .floatle(`lap_total`)
            .floatle(`stage_length`)
            .floatle(`lap_time`)
            .floatle(`vehicle_engine_rpm_max`)
            .floatle(`vehicle_engine_rpm_idle`)
            .floatle(`vehicle_gear_max`)

            .parse(buffer);

        if (parsed.stage_length === 0) {
            return null;
        };

        return {
            stage: {
                id: parseInt(parsed.stage_length * 100000),
                length: parsed.stage_length,
                progress: parsed.stage_progress,
                distance: parsed.stage_current_distance
            }
        };
    } catch (error) {
        return null;
    };
};

const wrc23 = function(buffer) {
    try {
        const parsed = new parser()
            .string(`packet_4cc`, { zeroTerminated: true, length: 4 })
            .doublele(`stage_length`)
            .floatle(`stage_progress`)
            .uint16le(`route_id`)
            .uint8(`vehicle_tyre_state_bl`)
            .uint8(`vehicle_tyre_state_br`)
            .uint8(`vehicle_tyre_state_fl`)
            .uint8(`vehicle_tyre_state_fr`)
            .parse(buffer);

        if (parsed.packet_4cc !== `sesu`) {
            return null;
        };

        return {
            stage: {
                id: parsed.route_id,
                length: parsed.stage_length,
                progress: parsed.stage_progress,
                distance: (parsed.stage_length / 100) * (parsed.stage_progress * 100)
            },
            vehicle: {
                tyres: {
                    fl: {
                        state: parsed.vehicle_tyre_state_fl === 0 ? 0 : 1
                    },
                    fr: {
                        state: parsed.vehicle_tyre_state_fr === 0 ? 0 : 1
                    },
                    rl: {
                        state: parsed.vehicle_tyre_state_bl === 0 ? 0 : 1
                    },
                    rr: {
                        state: parsed.vehicle_tyre_state_br === 0 ? 0 : 1
                    }
                }
            }
        };
    } catch (error) {
        return null;
    };
};

const acr25 = function(buffer) {
    try {
        const parsed = new parser()
            .parse(buffer);

        // if return

        return {
            stage: {
                id: 1,
                length: 10000,
                progress: 50,
                distance: 5000
            }
        };
    } catch (error) {
        return null;
    };
};


module.exports = {
    drt20,
    wrc23,
    acr25
};