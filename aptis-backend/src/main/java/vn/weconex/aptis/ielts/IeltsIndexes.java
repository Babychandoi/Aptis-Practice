package vn.weconex.aptis.ielts;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.ielts.IeltsModels.*;
@Component @RequiredArgsConstructor
public class IeltsIndexes implements ApplicationRunner {
    private final MongoTemplate mongo;
    public void run(ApplicationArguments args) {
        mongo.indexOps(Exam.class).ensureIndex(new Index().on("published",Sort.Direction.ASC).on("track",Sort.Direction.ASC).on("updatedAt",Sort.Direction.DESC));
        mongo.indexOps(Exam.class).ensureIndex(new Index().on("authorId",Sort.Direction.ASC).on("updatedAt",Sort.Direction.DESC));
        mongo.indexOps(Attempt.class).ensureIndex(new Index().on("userId",Sort.Direction.ASC).on("createdAt",Sort.Direction.DESC));
        mongo.indexOps(Attempt.class).ensureIndex(new Index().on("examAuthorId",Sort.Direction.ASC).on("status",Sort.Direction.ASC).on("createdAt",Sort.Direction.DESC));
        mongo.indexOps(Attempt.class).ensureIndex(new Index().on("status",Sort.Direction.ASC).on("createdAt",Sort.Direction.DESC));
    }
}
