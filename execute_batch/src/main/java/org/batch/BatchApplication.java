package org.batch;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.context.ApplicationContext;
import script.LoadLib;

@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)
public class BatchApplication {

    public static void main(String[] args) {
        ApplicationContext context = SpringApplication.run(BatchApplication.class, args);
        try {
            LoadLib.loadLib();
            context.getBean(Main.class).execute();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

}
